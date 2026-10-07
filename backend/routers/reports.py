import logging
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from users import require_roles
from models import User, WorkOrder, AuditLog

from services.work_order_reports import (
    build_work_order_context,
    render_work_order_report,
    convert_report_to_pdf,
)


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
)

logger = logging.getLogger(__name__)

# Matches your existing attachment read permissions.
REPORT_READ_ROLES = (
    "Resident",
    "Staff",
    "Manager",
    "President",
    "Board Member",
    "Treasurer",
    "Admin",
)


@router.get(
    "/work-orders/{work_order_number}/pdf",
    response_class=Response,
    responses={
        200: {
            "description": "Work order PDF report",
            "content": {"application/pdf": {}},
        }
    },
)
def download_work_order_report(
    work_order_number: str,
    current_user: User = Depends(
        require_roles(*REPORT_READ_ROLES)
    ),
    database: Session = Depends(get_db),
):
    try:
        context, photo_files = build_work_order_context(
            database=database,
            current_user=current_user,
            work_order_number=work_order_number,
        )

        docx_buffer = render_work_order_report(
            context=context,
            photo_files=photo_files,
        )

        try:
            pdf_content = convert_report_to_pdf(docx_buffer)
        finally:
            docx_buffer.close()

        # Resolve the internal ID within the authenticated account.
        work_order_id = database.scalar(
            select(WorkOrder.database_id).where(
                WorkOrder.work_order_number == work_order_number,
                WorkOrder.account_id == current_user.account_id,
            )
        )

        if work_order_id is None:
            raise HTTPException(404, "Work order not found")

        database.add(
            AuditLog(
                account_id=current_user.account_id,
                work_order_id=work_order_id,
                user_id=current_user.auth_user_id,
                user_name=(
                    f"{current_user.first_name} "
                    f"{current_user.last_name}"
                ).strip(),
                user_role=current_user.user_role,
                action="Generated work order PDF report",
                table_name="work_orders",
                record_id=context["work_order_number"],
                details=(
                    "Generated PDF report; template version "
                    f"{context['template_version']}"
                ),
            )
        )

        database.commit()

    except HTTPException:
        database.rollback()
        raise

    except Exception:
        database.rollback()
        logger.exception("Work order report generation failed")

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not generate the report. "
                "Check the backend logs for details."
            ),
        ) from None

    filename = quote(
        f"{context['work_order_number']}-report.pdf",
        safe="",
    )

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''{filename}"
            ),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
