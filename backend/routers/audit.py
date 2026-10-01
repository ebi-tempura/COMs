import logging

from fastapi import Depends, HTTPException

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from database import get_db
from models import ( User,
                    WorkOrder,
                    EmergencyWorkOrder, WorkCompletion, AuditLog)

from schemas import ( AuditLogRead )

from fastapi import APIRouter
from users import require_roles

router = APIRouter( 
    prefix="/api/audit",
    tags=["Audit"],
)

audit_logger = logging.getLogger(__name__)

def to_audit_log_read(record:AuditLog) -> AuditLogRead:
    return AuditLogRead(
        account_id=record.account_id,
        user_id=record.user_id,
        user_name=record.user_name,
        user_role=record.user_role,
        database_id=record.database_id,
        action=record.action,
        table_name=record.table_name,
        record_id=record.record_id,
        details=record.details,
        created_at=record.created_at,
    )

@router.get(
    "/api/audit-logs",
    response_model=list[AuditLogRead],
)

def read_audit_logs(
    current_user: User = Depends(require_roles("Admin","President",
                                               "Treasurer","Board Member")),
    database: Session=Depends(get_db),
):
    statement = (
        select(AuditLog)
        .where(AuditLog.account_id == current_user.account_id)
        .order_by(AuditLog.created_at.desc())
    )

    records = database.scalars(statement).all()

    return [
        to_audit_log_read(record)
        for record in records
    ]

@router.get(
    "/api/work-orders/{work_order_number}/audit-logs",
    response_model=list[AuditLogRead],
)

def read_work_order_audit_logs(
    work_order_number: str,
    current_user: User = Depends(
        require_roles("Admin", "President", "Treasurer", "Board Member")
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

    completion_record_ids = [
        str(record_id)
        for record_id in database.scalars(
            select(WorkCompletion.database_id).where(
                WorkCompletion.work_order_id == work_order.database_id
            )
        ).all()
    ]
    completion_record_ids.extend(
        database.scalars(
            select(WorkCompletion.completion_number).where(
                WorkCompletion.work_order_id == work_order.database_id
            )
        ).all()
    )

    emergency_record_ids = [
        str(record_id)
        for record_id in database.scalars(
            select(EmergencyWorkOrder.database_id).where(
                EmergencyWorkOrder.work_order_id == work_order.database_id
            )
        ).all()
    ]
    emergency_record_ids.extend(
        database.scalars(
            select(EmergencyWorkOrder.emergency_number).where(
                EmergencyWorkOrder.work_order_id == work_order.database_id
            )
        ).all()
    )

    statement = (
        select(AuditLog)
        .where(
            AuditLog.account_id == current_user.account_id,
            or_(
                (
                    AuditLog.table_name == "work_orders"
                )
                & (
                    AuditLog.record_id == work_order.work_order_number
                ),
                (
                    AuditLog.table_name == "work_order_completion"
                )
                & (
                    AuditLog.record_id.in_(
                        completion_record_ids
                    )
                ),
                (
                    AuditLog.table_name == "work_order_emergency"
                )
                & (
                    AuditLog.record_id.in_(
                        emergency_record_ids
                    )
                ),
            ),
        )
        .order_by(AuditLog.created_at.asc())
    )

    records = database.scalars(statement).all()

    return [
        to_audit_log_read(record)
        for record in records
    ]
