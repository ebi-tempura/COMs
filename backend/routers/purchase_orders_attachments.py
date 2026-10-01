import logging
import inspect

from datetime import datetime, timezone
from pathlib import PurePosixPath
from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from auth import WORK_ORDER_ATTACHMENTS_BUCKET, supabase_storage
from database import get_db
from models import AuditLog, PurchaseOrder, PurchaseOrderAttachment, User
from schemas import (
    PurchaseOrderAttachmentBatchRead,
    PurchaseOrderAttachmentRead,
    PurchaseOrderAttachmentUploadResult,
)
from users import require_roles


router = APIRouter(
    prefix="/api/purchase-orders",
    tags=["PO Attachments"],
)
logger = logging.getLogger(__name__)

MAX_ATTACHMENT_FILES = 5
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
MAX_ATTACHMENT_BATCH_SIZE = 25 * 1024 * 1024
ATTACHMENT_TYPES = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
}
ATTACHMENT_READ_ROLES = (
    "Admin", "Manager", "Staff", "President", "Board Member", "Treasurer"
)


def get_purchase_order_or_404(
    database: Session, account_id: str, purchase_order_number: str
) -> PurchaseOrder:
    record = database.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.account_id == account_id,
            PurchaseOrder.purchase_order_number == purchase_order_number,
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return record


def save_purchase_order_attachment(
    *,
    file: UploadFile,
    filename: str,
    purchase_order_id: int,
    purchase_order_number: str,
    actor: dict,
    database: Session,
) -> PurchaseOrderAttachmentRead:
    if (
        not filename.strip()
        or len(filename) > 255
        or any(ord(character) < 32 or ord(character) == 127 for character in filename)
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
        raise HTTPException(status_code=500, detail="Could not read the uploaded file") from None

    if not contents:
        raise HTTPException(status_code=400, detail="Empty files are not allowed")
    if len(contents) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(status_code=413, detail="Maximum file size is 10 MiB")

    mime_type, signature = ATTACHMENT_TYPES[extension]
    if not contents.startswith(signature):
        raise HTTPException(
            status_code=415,
            detail="File contents do not match the file extension",
        )

    # Increment and commit before storage access. Failed uploads leave a skipped
    # number; attachment numbers are never reused.
    try:
        sequence = database.execute(
            update(PurchaseOrder)
            .where(
                PurchaseOrder.database_id == purchase_order_id,
                PurchaseOrder.account_id == actor["account_id"],
            )
            .values(
                last_attachment_sequence=PurchaseOrder.last_attachment_sequence + 1
            )
            .returning(PurchaseOrder.last_attachment_sequence)
            .execution_options(synchronize_session=False)
        ).scalar_one()
        database.commit()
    except Exception:
        database.rollback()
        logger.exception("Could not reserve PO attachment number for %s", purchase_order_number)
        raise HTTPException(
            status_code=500, detail="Could not allocate an attachment number"
        ) from None

    attachment_number = f"{purchase_order_number}-A{sequence:02d}"
    storage_path = (
        f"{actor['account_id']}/purchase-orders/{purchase_order_number}/"
        f"{uuid4().hex}{extension}"
    )
    bucket = supabase_storage.storage.from_(WORK_ORDER_ATTACHMENTS_BUCKET)
    try:
        bucket.upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": mime_type, "upsert": "false"},
        )
    except Exception:
        logger.exception("Storage upload failed for PO path %s", storage_path)
        raise HTTPException(status_code=502, detail="File upload failed") from None

    try:
        record = PurchaseOrderAttachment(
            attachment_number=attachment_number,
            purchase_order_id=purchase_order_id,
            account_id=actor["account_id"],
            uploaded_by_user_id=actor["database_id"],
            original_filename=filename,
            storage_path=storage_path,
            mime_type=mime_type,
            size_bytes=len(contents),
        )
        database.add(record)
        database.flush()
        database.add(
            AuditLog(
                account_id=actor["account_id"],
                work_order_id=actor["work_order_id"],
                user_id=actor["auth_user_id"],
                user_name=actor["user_name"],
                user_role=actor["user_role"],
                action="Uploaded purchase order attachment",
                table_name="purchase_order_attachments",
                record_id=attachment_number,
                details=(
                    f"Uploaded invoice file {filename} as {attachment_number} "
                    f"for {purchase_order_number}; size={len(contents)} bytes"
                ),
            )
        )
        database.flush()
        response = PurchaseOrderAttachmentRead.model_validate(record)
    except Exception:
        database.rollback()
        try:
            bucket.remove([storage_path])
        except Exception:
            logger.exception("PO attachment cleanup failed for %s", storage_path)
        logger.exception("Could not save PO attachment metadata %s", attachment_number)
        raise HTTPException(
            status_code=500, detail="Could not save attachment metadata"
        ) from None

    try:
        database.commit()
    except Exception:
        database.rollback()
        logger.exception(
            "PO attachment commit uncertain; reconcile %s at %s",
            attachment_number, storage_path
        )
        raise HTTPException(
            status_code=500,
            detail="Could not confirm attachment save; check the attachment list before retrying",
        ) from None
    return response


@router.post(
    "/{purchase_order_number}/attachments",
    response_model=PurchaseOrderAttachmentBatchRead,
    status_code=200,
)
def upload_purchase_order_attachments(
    purchase_order_number: str,
    files: list[UploadFile] = File(..., description="Upload up to 5 invoice files"),
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
    database: Session = Depends(get_db),
):
    try:
        purchase_order = get_purchase_order_or_404(
            database, current_user.account_id, purchase_order_number
        )
        if purchase_order.status != "Approved":
            raise HTTPException(
                status_code=409,
                detail="Invoices can only be attached to an approved purchase order",
            )
        if not 1 <= len(files) <= MAX_ATTACHMENT_FILES:
            raise HTTPException(status_code=400, detail="Upload between 1 and 5 files per request")

        total_size = 0
        for file in files:
            file.file.seek(0, 2)
            total_size += file.file.tell()
            file.file.seek(0)
        if total_size > MAX_ATTACHMENT_BATCH_SIZE:
            raise HTTPException(status_code=413, detail="Combined file size cannot exceed 25 MiB")

        purchase_order_id = purchase_order.database_id
        actual_number = purchase_order.purchase_order_number
        actor = {
            "account_id": current_user.account_id,
            "database_id": current_user.database_id,
            "auth_user_id": current_user.auth_user_id,
            "user_name": f"{current_user.first_name} {current_user.last_name}",
            "user_role": current_user.user_role,
            "work_order_id": purchase_order.work_order_id,
        }
        database.commit()

        results = []
        for index, file in enumerate(files, start=1):
            filename = (file.filename or "").replace("\\", "/").split("/")[-1]
            try:
                attachment = save_purchase_order_attachment(
                    file=file,
                    filename=filename,
                    purchase_order_id=purchase_order_id,
                    purchase_order_number=actual_number,
                    actor=actor,
                    database=database,
                )
                results.append(
                    PurchaseOrderAttachmentUploadResult(
                        file_index=index, original_filename=filename,
                        status_code=201, attachment=attachment
                    )
                )
            except HTTPException as error:
                results.append(
                    PurchaseOrderAttachmentUploadResult(
                        file_index=index, original_filename=filename,
                        status_code=error.status_code, error=str(error.detail)
                    )
                )

        uploaded = sum(result.status_code == 201 for result in results)
        return PurchaseOrderAttachmentBatchRead(
            uploaded_count=uploaded, failed_count=len(results) - uploaded, results=results
        )
    finally:
        for file in files:
            file.file.close()


@router.get(
    "/{purchase_order_number}/attachments",
    response_model=list[PurchaseOrderAttachmentRead],
)
def list_purchase_order_attachments(
    purchase_order_number: str,
    current_user: User = Depends(require_roles(*ATTACHMENT_READ_ROLES)),
    database: Session = Depends(get_db),
):
    purchase_order = get_purchase_order_or_404(
        database, current_user.account_id, purchase_order_number
    )
    records = database.scalars(
        select(PurchaseOrderAttachment)
        .where(
            PurchaseOrderAttachment.purchase_order_id == purchase_order.database_id,
            PurchaseOrderAttachment.account_id == current_user.account_id,
            PurchaseOrderAttachment.deleted_at.is_(None),
        )
        .order_by(PurchaseOrderAttachment.database_id)
    ).all()
    return [PurchaseOrderAttachmentRead.model_validate(record) for record in records]


@router.get(
    "/{purchase_order_number}/attachments/{attachment_number}/download",
    response_class=Response,
)
def download_purchase_order_attachment(
    purchase_order_number: str,
    attachment_number: str,
    current_user: User = Depends(require_roles(*ATTACHMENT_READ_ROLES)),
    database: Session = Depends(get_db),
):
    purchase_order = get_purchase_order_or_404(
        database, current_user.account_id, purchase_order_number
    )
    record = database.scalar(
        select(PurchaseOrderAttachment).where(
            PurchaseOrderAttachment.attachment_number == attachment_number,
            PurchaseOrderAttachment.purchase_order_id == purchase_order.database_id,
            PurchaseOrderAttachment.account_id == current_user.account_id,
            PurchaseOrderAttachment.deleted_at.is_(None),
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    try:
        result = (
            supabase_storage.storage.from_(WORK_ORDER_ATTACHMENTS_BUCKET)
            .download(record.storage_path)
        )
        contents = result if isinstance(result, bytes) else getattr(result, "content", None)
        if contents is None:
            raise ValueError("Storage returned no file contents")
    except Exception:
        logger.exception("Could not download PO attachment %s", record.attachment_number)
        raise HTTPException(status_code=502, detail="Could not download attachment") from None

    return Response(
        content=contents,
        media_type=record.mime_type,
        headers={
            "Content-Disposition": (
                "attachment; filename*=UTF-8''"
                f"{quote(record.original_filename, safe='')}"
            ),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete(
    "/{purchase_order_number}/attachments/{attachment_number}",
    status_code=204,
)
def delete_purchase_order_attachment(
    purchase_order_number: str,
    attachment_number: str,
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
    database: Session = Depends(get_db),
):
    purchase_order = get_purchase_order_or_404(
        database, current_user.account_id, purchase_order_number
    )
    record = database.scalar(
        select(PurchaseOrderAttachment).where(
            PurchaseOrderAttachment.attachment_number == attachment_number,
            PurchaseOrderAttachment.purchase_order_id == purchase_order.database_id,
            PurchaseOrderAttachment.account_id == current_user.account_id,
            PurchaseOrderAttachment.deleted_at.is_(None),
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    record.deleted_at = datetime.now(timezone.utc)
    record.deleted_by_user_id = current_user.database_id
    database.add(
        AuditLog(
            account_id=current_user.account_id,
            work_order_id=purchase_order.work_order_id,
            user_id=current_user.auth_user_id,
            user_name=f"{current_user.first_name} {current_user.last_name}",
            user_role=current_user.user_role,
            action="Deleted purchase order attachment",
            table_name="purchase_order_attachments",
            record_id=record.attachment_number,
            details=(
                f"Soft-deleted invoice file {record.original_filename} "
                f"from {purchase_order.purchase_order_number}"
            ),
        )
    )
    database.commit()
    return Response(status_code=204)
