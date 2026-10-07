import subprocess
import sys
from tempfile import TemporaryDirectory
from threading import Lock

from io import BytesIO
from pathlib import Path
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from jinja2 import Environment, StrictUndefined
from datetime import datetime, timezone
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import Session
from fastapi import HTTPException

from COMs.backend import database
from models import (
    WorkOrder,
    BuildingAccount,
    User,
    Supplier,
    EmergencyWorkOrder,
    WorkOrderAttachment,
    AuditLog,
    WorkCompletion,
    PurchaseOrder,
)
from auth import supabase_storage, WORK_ORDER_ATTACHMENTS_BUCKET


TEMPLATE_PATH = (
    Path(__file__).resolve().parent.parent
    / "templates"
    / "work_order_report.docx"
)

WORD_CONVERSION_LOCK = Lock()


def convert_report_to_pdf(docx_buffer: BytesIO) -> bytes:
    with WORD_CONVERSION_LOCK:
        with TemporaryDirectory(prefix="coms-report-") as temp_folder:
            folder = Path(temp_folder)
            docx_path = folder / "report.docx"
            pdf_path = folder / "report.pdf"

            docx_path.write_bytes(docx_buffer.getvalue())

            try:
                result = subprocess.run(
                    [
                        sys.executable,
                        "-c",
                        (
                            "import sys; "
                            "from docx2pdf import convert; "
                            "convert(sys.argv[1], sys.argv[2], keep_active=True)"
                        ),
                        str(docx_path),
                        str(pdf_path),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=60,
                    check=False,
                )
            except subprocess.TimeoutExpired:
                raise RuntimeError(
                    "Word PDF conversion exceeded 60 seconds"
                ) from None

            if result.returncode != 0 or not pdf_path.is_file():
                raise RuntimeError(
                    "Word PDF conversion failed. Check that Word "
                    "is installed, activated, and allowed to be "
                    "controlled by your terminal."
                )

            pdf_content = pdf_path.read_bytes()

            if not pdf_content.startswith(b"%PDF-"):
                raise RuntimeError(
                    "Word did not produce a valid PDF"
                )

            return pdf_content

def render_work_order_report(
    context: dict,
    photo_files: list[dict],
) -> BytesIO:
    """
    Fill the Word template and return the generated DOCX in memory.

    photo_files contains dictionaries with:
      content: downloaded image bytes
      attachment_number: attachment reference
      original_filename: original image filename

    context contains the report fields and the documents/audit lists.
    """
    if not TEMPLATE_PATH.is_file():
        raise FileNotFoundError(
            f"Report template not found: {TEMPLATE_PATH}"
        )

    template = DocxTemplate(str(TEMPLATE_PATH))

    # Keep image streams alive until the report has been saved.
    image_streams = []
    photos = []

    for photo in photo_files:
        stream = BytesIO(photo["content"])
        image_streams.append(stream)

        photos.append({
            "image": InlineImage(
                template,
                stream,
                width=Mm(100),
            ),
            "attachment_number": photo["attachment_number"],
            "original_filename": photo["original_filename"],
        })

    report_context = {
        **context,
        "photos": photos,
    }

    # Missing variables raise an error instead of silently becoming blank.
    environment = Environment(undefined=StrictUndefined)

    template.render(
        report_context,
        jinja_env=environment,
        autoescape=True,
    )

    output = BytesIO()
    template.save(output)
    output.seek(0)

    return output


def display_date(value):
    if value is None:
        return ""

    if isinstance(value, datetime):
        # SQLite may return stored UTC timestamps without timezone info.
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)

        return value.astimezone(timezone.utc).strftime(
            "%Y-%m-%d %H:%M UTC"
        )

    return value.strftime("%Y-%m-%d")


def user_full_name(user):
    return f"{user.first_name} {user.last_name}".strip()


def build_work_order_context(
    database: Session,
    current_user: User,
    work_order_number: str,
):
    wo = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number,
            WorkOrder.account_id == current_user.account_id,
        )
    )

    if wo is None:
        raise HTTPException(404, "Work order not found")

    building = database.scalar(
        select(BuildingAccount).where(
            BuildingAccount.account_id == current_user.account_id,
        )
    )

    supplier = database.scalar(
        select(Supplier).where(
            Supplier.database_id == wo.supplier_database_id,
            Supplier.account_id == current_user.account_id,
        )
    )

    creator = database.scalar(
        select(User).where(
            User.database_id == wo.created_by_user_id,
            User.account_id == current_user.account_id,
        )
    )

    if building is None or supplier is None or creator is None:
        raise HTTPException(
            409,
            "The work order has missing or inconsistent linked records",
        )

    # Emergency records inherit account scope from the verified WO.
    emergency_records = database.scalars(
        select(EmergencyWorkOrder)
        .where(EmergencyWorkOrder.work_order_id == wo.database_id)
        .order_by(EmergencyWorkOrder.database_id)
    ).all()

    # Your template currently displays one emergency record.
    # Do not silently discard records if there is more than one.
    if len(emergency_records) > 1:
        raise HTTPException(
            409,
            "Multiple emergency records exist; the template needs "
            "an emergency loop",
        )

    emergency = emergency_records[0] if emergency_records else None

    emergency_context = {
        "emergency_number": "",
        "wo_emergency_what": "",
        "wo_emergency_where": "",
        "wo_emergency_when": "",
        "wo_emergency_who": "",
        "wo_emergency_why": "",
        "wo_emergency_howmany": "",
        "wo_emergency_howmuch": "",
        "status": "",
        "created_at": "",
    }

    if emergency is not None:
        for key in emergency_context:
            value = getattr(emergency, key)
            if key in {"wo_emergency_when", "created_at"}:
                value = display_date(value)

            emergency_context[key] = value or ""

        completion_records = database.scalars(
        select(WorkCompletion)
        .where(WorkCompletion.work_order_id == wo.database_id)
        .order_by(WorkCompletion.database_id)
    ).all()

    completions = []

    for completion in completion_records:
        completion_creator = database.scalar(
            select(User).where(
                User.database_id == completion.created_by_user_id,
                User.account_id == current_user.account_id,
            )
        )

        if completion_creator is None:
            raise HTTPException(
                409,
                "Completion has a missing or inconsistent creator",
            )

        completions.append({
            "completion_number": completion.completion_number,
            "work_performed_description":
                completion.work_performed_description,
            "work_performed_observation":
                completion.work_performed_observation,
            "work_performed_date":
                display_date(completion.work_performed_date),
            "status": completion.status,
            "created_at": display_date(completion.created_at),
            "created_by_name": user_full_name(completion_creator),
        })

    po_records = database.scalars(
        select(PurchaseOrder)
        .where(
            PurchaseOrder.work_order_id == wo.database_id,
            PurchaseOrder.account_id == current_user.account_id,
        )
        .order_by(PurchaseOrder.database_id)
    ).all()

    purchase_orders = []

    for po in po_records:
        po_supplier = database.scalar(
            select(Supplier).where(
                Supplier.database_id == po.supplier_database_id,
                Supplier.account_id == current_user.account_id,
            )
        )

        if po_supplier is None:
            raise HTTPException(
                409,
                "Purchase order has a missing or inconsistent supplier",
            )

        purchase_orders.append({
            "purchase_order_number": po.purchase_order_number,
            "title": po.title,
            "description": po.description or "",
            "amount": f"{po.amount:,.2f}",
            "status": po.status,
            "priority": po.priority,
            "supplier_id": po_supplier.supplier_id or "",
            "supplier_name": po_supplier.supplier_name,
            "created_at": display_date(po.created_at),
        })

    attachments = database.scalars(
        select(WorkOrderAttachment)
        .where(
            WorkOrderAttachment.work_order_id == wo.database_id,
            WorkOrderAttachment.account_id == current_user.account_id,
            WorkOrderAttachment.deleted_at.is_(None),
        )
        .order_by(WorkOrderAttachment.database_id)
    ).all()

    # Some older WO audit entries have a reference but no work_order_id.
    # Match those only when their table and record reference identify this WO.
    attachment_numbers = database.scalars(
        select(WorkOrderAttachment.attachment_number).where(
            WorkOrderAttachment.work_order_id == wo.database_id,
            WorkOrderAttachment.account_id == current_user.account_id,
        )
    ).all()

    audit_conditions = [
        AuditLog.work_order_id == wo.database_id,
        and_(
            AuditLog.table_name == "work_orders",
            AuditLog.record_id == wo.work_order_number,
        ),
    ]

    if attachment_numbers:
        audit_conditions.append(
            and_(
                AuditLog.table_name == "work_order_attachments",
                AuditLog.record_id.in_(attachment_numbers),
            )
        )
        completion_numbers = [
        record.completion_number for record in completion_records
    ]

    if completion_numbers:
        audit_conditions.append(
            and_(
                AuditLog.table_name == WorkCompletion.__tablename__,
                AuditLog.record_id.in_(completion_numbers),
            )
        )

    emergency_numbers = [
        record.emergency_number for record in emergency_records
    ]

    if emergency_numbers:
        audit_conditions.append(
            and_(
                AuditLog.table_name == EmergencyWorkOrder.__tablename__,
                AuditLog.record_id.in_(emergency_numbers),
            )
        )

    po_numbers = [
        record.purchase_order_number for record in po_records
    ]

    if po_numbers:
        audit_conditions.append(
            and_(
                AuditLog.table_name == PurchaseOrder.__tablename__,
                AuditLog.record_id.in_(po_numbers),
            )
        )

    events = database.scalars(
        select(AuditLog)
        .where(
            AuditLog.account_id == current_user.account_id,
            or_(*audit_conditions),
        )
        .order_by(AuditLog.created_at, AuditLog.database_id)
    ).all()

    context = {
        "account_id": building.account_id,
        "account_name": building.account_name,
        "building_name": building.building_name,
        "building_address": building.building_address,

        "work_order_number": wo.work_order_number,
        "title": wo.title,
        "description": wo.description or "",
        "type": wo.type,
        "status": wo.status,
        "priority": wo.priority,
        "category": wo.category,
        "location": wo.location,
        "amount": f"{wo.amount:,.2f}",
        "target_date": display_date(wo.target_date),
        "created_at": display_date(wo.created_at),
        "created_by_name": user_full_name(creator),
        "created_by_role": creator.user_role,

        "supplier_id": supplier.supplier_id or "",
        "supplier_name": supplier.supplier_name,
        "supplier_type": supplier.supplier_type,
        "supplier_service_category": supplier.service_category,
        "supplier_contact": supplier.contact,
        "supplier_phone": supplier.phone,
        "supplier_email": supplier.email,
        "supplier_rfc": supplier.rfc,
        "supplier_address": supplier.address,
        "supplier_payment_method": supplier.payment_method,

        "has_emergency": emergency is not None,
        "emergency": emergency_context,

        "report_generated_at": display_date(
            datetime.now(timezone.utc)
        ),
        "report_generated_by": user_full_name(current_user),
        "template_version": "1.1",

        "completions": completions,
        "has_completions": bool(completions),

        "purchase_orders": purchase_orders,
        "has_purchase_orders": bool(purchase_orders),

        "documents": [],
        "audit_events": [
            {
                "created_at": display_date(event.created_at),
                "user_name": event.user_name or "",
                "user_role": event.user_role or "",
                "action": event.action,
                "details": event.details or "",
            }
            for event in events
        ],
    }

    photo_files = []
    total_image_bytes = 0

    bucket = supabase_storage.storage.from_(
        WORK_ORDER_ATTACHMENTS_BUCKET
    )

    for attachment in attachments:
        metadata = {
            "attachment_number": attachment.attachment_number,
            "original_filename": attachment.original_filename,
            "mime_type": attachment.mime_type,
            "size_bytes": attachment.size_bytes,
            "created_at": display_date(attachment.created_at),
        }

        if attachment.mime_type == "application/pdf":
            context["documents"].append(metadata)
            continue

        if attachment.mime_type not in {"image/jpeg", "image/png"}:
            raise HTTPException(
                409,
                "Unsupported attachment type in the work order",
            )

        # Limit the total images embedded in a single report.
        total_image_bytes += attachment.size_bytes
        if total_image_bytes > 50 * 1024 * 1024:
            raise HTTPException(
                413,
                "Report photos exceed the 50 MiB limit",
            )

        try:
            content = bucket.download(attachment.storage_path)
        except Exception:
            raise HTTPException(
                502,
                "Could not retrieve a report photo from storage",
            ) from None

        if len(content) != attachment.size_bytes:
            raise HTTPException(
                502,
                "A report photo does not match its stored size",
            )

        photo_files.append({
            **metadata,
            "content": content,
        })
    
    return context, photo_files