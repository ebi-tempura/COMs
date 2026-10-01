import logging
import inspect

from datetime import datetime, timezone
from fastapi import Depends, HTTPException, File, UploadFile, Response, APIRouter

from pathlib import PurePosixPath
from uuid import uuid4
from urllib.parse import quote

from sqlalchemy import  select, update
from sqlalchemy.orm import Session

from database import get_db
from users import require_roles
from models import ( User,
                    WorkOrder, AuditLog, WorkOrderAttachment)

from schemas import (WorkOrderAttachmentRead, WorkOrderAttachmentBatchRead,
                    WorkOrderAttachmentUploadResult)

from auth import  supabase_storage,WORK_ORDER_ATTACHMENTS_BUCKET

router = APIRouter(   
    prefix="/api/attachments",
    tags=["WO Attachments"],
)

attachment_logger = logging.getLogger(__name__)

MAX_ATTACHMENT_FILES = 5
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
MAX_ATTACHMENT_BATCH_SIZE = 25 * 1024 * 1024

ATTACHMENT_TYPES = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
}

def save_work_order_attachment(
    *,
    file: UploadFile,
    filename: str,
    work_order_id: int,
    work_order_number: str,
    actor: dict,
    database: Session,
) -> WorkOrderAttachmentRead:
    # Validate this file before reserving a number or uploading.
    if (
        not filename.strip()
        or len(filename) > 255
        or any(
            ord(character) < 32 or ord(character) == 127
            for character in filename
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid filename; maximum length is 255 characters",
        )

    extension = PurePosixPath(filename).suffix.lower()

    if extension not in ATTACHMENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PDF, JPG, JPEG, and PNG files are allowed",
        )

    try:
        file.file.seek(0)
        contents = file.file.read(MAX_ATTACHMENT_SIZE + 1)
    except OSError:
        raise HTTPException(
            status_code=500,
            detail="Could not read the uploaded file",
        ) from None

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Empty files are not allowed",
        )

    if len(contents) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 10 MiB",
        )

    mime_type, signature = ATTACHMENT_TYPES[extension]

    if not contents.startswith(signature):
        raise HTTPException(
            status_code=415,
            detail="File contents do not match the file extension",
        )

    # Reserve a sequence in a short database transaction.
    # Commit before contacting storage to release SQLite's write lock.
    try:
        sequence = database.execute(
            update(WorkOrder)
            .where(
                WorkOrder.database_id == work_order_id,
                WorkOrder.account_id == actor["account_id"],
            )
            .values(
                last_attachment_sequence=(
                    WorkOrder.last_attachment_sequence + 1
                )
            )
            .returning(WorkOrder.last_attachment_sequence)
            .execution_options(synchronize_session=False)
        ).scalar_one()

        database.commit()

    except Exception:
        database.rollback()

        attachment_logger.exception(
            "Could not reserve attachment number for work order %s",
            work_order_number,
        )

        raise HTTPException(
            status_code=500,
            detail="Could not allocate an attachment number",
        ) from None

    attachment_number = (
        f"{work_order_number}-A{sequence:02d}"
    )

    storage_path = (
        f"{actor['account_id']}/"
        f"{work_order_id}/"
        f"{uuid4().hex}{extension}"
    )

    bucket = supabase_storage.storage.from_(
        WORK_ORDER_ATTACHMENTS_BUCKET
    )

    try:
        bucket.upload(
            path=storage_path,
            file=contents,
            file_options={
                "content-type": mime_type,
                "upsert": "false",
            },
        )

    except Exception:
        # A timeout can leave an object in storage even if no
        # successful response was received. Keep its path in logs.
        attachment_logger.error(
            "Storage upload failed; inspect storage path %s",
            storage_path,
        )

        raise HTTPException(
            status_code=502,
            detail="File upload failed",
        ) from None

    try:
        record = WorkOrderAttachment(
            attachment_number=attachment_number,
            work_order_id=work_order_id,
            account_id=actor["account_id"],
            uploaded_by_user_id=actor["database_id"],
            original_filename=filename,
            storage_path=storage_path,
            mime_type=mime_type,
            size_bytes=len(contents),
        )

        database.add(record)
        database.flush()

        audit_record = AuditLog(
            account_id=actor["account_id"],
            work_order_id=work_order_id,
            user_id=actor["auth_user_id"],
            user_name=actor["user_name"],
            user_role=actor["user_role"],
            action="Uploaded work order attachment",
            table_name="work_order_attachments",
            record_id=attachment_number,
            details=(
                f"Uploaded {filename} as {attachment_number}; "
                f"size={len(contents)} bytes"
            ),
        )

        database.add(audit_record)
        database.flush()

        response = WorkOrderAttachmentRead.model_validate(record)

    except Exception:
        database.rollback()

        attachment_logger.exception(
            "Could not prepare metadata for attachment %s",
            attachment_number,
        )

        # No commit was attempted, so remove the uploaded object.
        try:
            bucket.remove([storage_path])
        except Exception:
            attachment_logger.error(
                "Attachment cleanup failed; inspect storage path %s",
                storage_path,
            )

        raise HTTPException(
            status_code=500,
            detail="Could not save attachment metadata",
        ) from None

    try:
        # Metadata and its audit event commit together.
        database.commit()

    except Exception:
        database.rollback()

        # Preserve storage if the commit outcome is uncertain.
        # Deleting here could remove a successfully committed file.
        attachment_logger.exception(
            "Attachment commit failed; reconcile attachment %s "
            "and storage path %s",
            attachment_number,
            storage_path,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not confirm attachment save; "
                "check the attachment list before retrying"
            ),
        ) from None

    return response

@router.post(
    "/api/work-orders/{work_order_number}/attachments",
    response_model=WorkOrderAttachmentBatchRead,
    status_code=200,
)

def upload_work_order_attachments(
    work_order_number: str,
    files: list[UploadFile] = File(
        ...,
        description="Upload up to 5 files",
    ),
    current_user: User = Depends(
        require_roles("Admin", "Manager", "Staff")
    ),
    database: Session = Depends(get_db),
):
    
    try:
        work_order = database.scalar(
            select(WorkOrder).where(
                WorkOrder.work_order_number == work_order_number,
                WorkOrder.account_id == current_user.account_id,
            )
        )

        if work_order is None:
            raise HTTPException(
                status_code=404,
                detail="Work order not found",
            )

        if not 1 <= len(files) <= MAX_ATTACHMENT_FILES:
            raise HTTPException(
                status_code=400,
                detail="Upload between 1 and 5 files per request",
            )

        # Check the combined size before uploading any file.
        # Uploaded files are seekable temporary files.
        total_size = 0

        for file in files:
            file.file.seek(0, 2)
            total_size += file.file.tell()
            file.file.seek(0)

        if total_size > MAX_ATTACHMENT_BATCH_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Combined file size cannot exceed 25 MiB",
            )

        # Copy these values before commits/rollbacks expire ORM objects.
        work_order_id = work_order.database_id
        actual_work_order_number = work_order.work_order_number

        actor = {
            "account_id": current_user.account_id,
            "database_id": current_user.database_id,
            "auth_user_id": current_user.auth_user_id,
            "user_name": (
                f"{current_user.first_name} {current_user.last_name}"
            ),
            "user_role": current_user.user_role,
        }

        # Finish the authorization lookup transaction before processing.
        database.commit()

        results = []

        for file_index, file in enumerate(files, start=1):
            filename = (
                (file.filename or "")
                .replace("\\", "/")
                .split("/")[-1]
            )

            try:
                attachment = save_work_order_attachment(
                    file=file,
                    filename=filename,
                    work_order_id=work_order_id,
                    work_order_number=actual_work_order_number,
                    actor=actor,
                    database=database,
                )

                result = WorkOrderAttachmentUploadResult(
                    file_index=file_index,
                    original_filename=filename,
                    status_code=201,
                    attachment=attachment,
                )

            except HTTPException as error:
                result = WorkOrderAttachmentUploadResult(
                    file_index=file_index,
                    original_filename=filename,
                    status_code=error.status_code,
                    error=str(error.detail),
                )

            results.append(result)

        uploaded_count = sum(
            result.status_code == 201
            for result in results
        )

        return WorkOrderAttachmentBatchRead(
            uploaded_count=uploaded_count,
            failed_count=len(results) - uploaded_count,
            results=results,
        )

    finally:
        # Close every file, including after request-level rejection.
        for file in files:
            file.file.close()

ATTACHMENT_READ_ROLES = (
    "Resident",
    "Staff",
    "Manager",
    "President",
    "Board Member",
    "Treasurer",
    "Admin",
)

@router.get(
    "/api/work-orders/{work_order_number}/attachments",
    response_model=list[WorkOrderAttachmentRead],
)

def list_work_order_attachments(
    work_order_number: str,
    current_user: User = Depends(
        require_roles(*ATTACHMENT_READ_ROLES)
    ),
    database: Session = Depends(get_db),
):
    work_order = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number,
            WorkOrder.account_id == current_user.account_id,
        )
    )

    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )

    records = database.scalars(
        select(WorkOrderAttachment)
        .where(
            WorkOrderAttachment.work_order_id
            == work_order.database_id,
            WorkOrderAttachment.account_id
            == current_user.account_id,
            WorkOrderAttachment.deleted_at.is_(None)
        )
        .order_by(WorkOrderAttachment.database_id)
    ).all()

    return [
        WorkOrderAttachmentRead.model_validate(record)
        for record in records
    ]

@router.get(
    "/api/work-orders/{work_order_number}"
    "/attachments/{attachment_number}/download",
    response_class=Response,
    responses={
        200: {
            "description": "Attachment file",
            "content": {
                "application/pdf": {},
                "image/jpeg": {},
                "image/png": {},
            },
        },
    },
)

def download_work_order_attachment(
    work_order_number: str,
    attachment_number: str,
    current_user: User = Depends(
        require_roles(*ATTACHMENT_READ_ROLES)
    ),
    database: Session = Depends(get_db),
):
    work_order = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number,
            WorkOrder.account_id == current_user.account_id,
        )
    )

    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )

    record = database.scalar(
        select(WorkOrderAttachment).where(
            WorkOrderAttachment.attachment_number == attachment_number,
            WorkOrderAttachment.work_order_id == work_order.database_id,
            WorkOrderAttachment.account_id == current_user.account_id,
            WorkOrderAttachment.deleted_at.is_(None),

        )
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Attachment not found",
        )

    # Obtain the storage path from our database, not the caller.
    try:
        contents = (
            supabase_storage.storage
            .from_(WORK_ORDER_ATTACHMENTS_BUCKET)
            .download(record.storage_path)
        )
    except Exception:
        attachment_logger.error(
            "Storage download failed for attachment %s",
            record.database_id,
        )
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve attachment from storage",
        ) from None

    encoded_filename = quote(record.original_filename, safe="")

    return Response(
        content=contents,
        media_type=record.mime_type,
        headers={
            "Content-Disposition": (
                "attachment; "
                f"filename*=UTF-8''{encoded_filename}"
            ),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )

print("LOADED FILE:", __file__)

@router.delete(
    "/api/work-orders/{work_order_number}/attachments/{attachment_number}",
    status_code=204,
)

def delete_work_order_attachment(
    work_order_number: str,
    attachment_number: str,
    current_user: User = Depends(
        require_roles("Admin", "Manager", "Staff")
    ),
    database: Session = Depends(get_db),
):
    work_order = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number,
            WorkOrder.account_id == current_user.account_id,
        )
    )

    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )

    attachment = database.scalar(
        select(WorkOrderAttachment).where(
            WorkOrderAttachment.attachment_number == attachment_number,
            WorkOrderAttachment.work_order_id == work_order.database_id,
            WorkOrderAttachment.account_id == current_user.account_id,
            WorkOrderAttachment.deleted_at.is_(None),
        )
    )

    if attachment is None:
        raise HTTPException(
            status_code=404,
            detail="Attachment not found",
        )

    attachment.deleted_at = datetime.now(timezone.utc)
    attachment.deleted_by_user_id = current_user.database_id

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Deleted work order attachment",
        table_name="work_order_attachments",
        record_id=attachment.attachment_number,
        details=(
            f"Soft-deleted {attachment.original_filename} "
            f"from {work_order.work_order_number}"
        ),
    )

    database.add(audit_record)
    database.commit()

    return Response(status_code=204)

for route in router.routes:
    if "attachment" in route.path:
        print(
            "ATTACHMENT ROUTE:",
            route.path,
            route.methods,
            route.endpoint.__name__,
            inspect.signature(route.endpoint),
        )