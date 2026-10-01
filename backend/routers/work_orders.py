import logging

from datetime import datetime
from decimal import Decimal
from fastapi import Depends, HTTPException, APIRouter

from sqlalchemy import func, select, Integer, cast, func
from sqlalchemy.orm import Session

from database import get_db
from users import require_roles
from models import User, WorkOrder, Supplier, AuditLog
from schemas import  WorkOrderCreate, WorkOrderRead
from users import get_current_user

router = APIRouter(    
    prefix="/api/work_orders",
    tags=["Work Orders"],
    )

audit_logger = logging.getLogger(__name__)


def to_work_order_read(record: WorkOrder) -> WorkOrderRead:
    
    return WorkOrderRead(
        database_id=record.database_id,
        account_id=record.account_id,
        created_by_user_id=record.created_by_user_id,
        work_order_number=record.work_order_number,
        status=record.status,
        title=record.title,
        supplier_id=record.supplier_record.supplier_id,
        supplier_name=record.supplier_record.supplier_name,
        amount=record.amount,
        priority=record.priority,
        type=record.type,
        category=record.category,
        location=record.location,
        target_date=record.target_date,
        description=record.description,
        created_at=record.created_at,
    )

@router.post(
    "/api/work-orders",
    response_model=WorkOrderRead,
    status_code=201,
)

def create_work_order(
    work_order: WorkOrderCreate,
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
    database: Session = Depends(get_db),
):

    supplier = database.scalar(
    select(Supplier).where(
        Supplier.supplier_id == work_order.supplier_id,
        Supplier.account_id == current_user.account_id,
    )
)

    if supplier is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found",
        )
    
    record = WorkOrder(
        account_id=current_user.account_id,
        status="Draft",
        created_year=datetime.now().year,
        title=work_order.title,

        supplier_database_id=supplier.database_id,

        amount=work_order.amount,
        priority=work_order.priority,
        type=work_order.type,
        category=work_order.category,
        location=work_order.location,
        description=work_order.description,
        target_date=work_order.target_date,
        created_by_user_id=current_user.database_id,
    )
    database.add(record)
    database.flush()

    year_prefix = f"WO-{record.created_year}-"

    last_number = (
        database.query(
            func.max(
                cast(
                    func.substr(WorkOrder.work_order_number, len(year_prefix) + 1),
                    Integer,
                )
            )
        )
        .filter(
            WorkOrder.account_id == current_user.account_id,
            WorkOrder.created_year == record.created_year,
            WorkOrder.work_order_number.like(f"{year_prefix}%"),
        )
        .scalar()
    )

    next_number = (last_number or 0) + 1
    record.work_order_number = f"{year_prefix}{next_number:04d}"

    database.add(record)
    database.flush()

    audit_record = AuditLog(
            account_id=current_user.account_id,
            user_id=current_user.auth_user_id,
            user_name=f"{current_user.first_name} {current_user.last_name}",
            user_role=current_user.user_role,
            action="Created work order",
            table_name="work_orders",
            record_id=record.work_order_number,
            details=f"Work order created as Draft by {current_user.user_role}",
            )
    
    database.add(audit_record)
    database.commit()
    database.refresh(record)

    return to_work_order_read(record)

@router.post(
    "/api/work-orders/{work_order_number}/submit",
    response_model= WorkOrderRead,
)

def submit_work_order(
    work_order_number:str,
    current_user: User =Depends(require_roles("Staff","Manager")),
    database:Session=Depends(get_db),
):
    work_order = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number,
            WorkOrder.account_id == current_user.account_id,
        )
    )

    if work_order is None:
        raise HTTPException(
            status_code= 404,
            detail= "Work order not found"
        )

    if work_order.status != "Draft":
        raise HTTPException(
            status_code= 409,
            detail="Only Draft orders can be submitted"
        )

    if work_order.created_by_user_id != current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Only Work Order creator can submit it",
        )

    is_emergency = work_order.type == "Emergency"
    work_order.status = (
        "In Progress"
        if is_emergency
        else "Pending President Approval"
    )

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Submitted work order",
        table_name="work_orders",
        record_id=work_order.work_order_number,
        details=(
            f"Emergency work order submitted by {current_user.user_role}; "
            "initial approvals bypassed; ready for work completion"
            if is_emergency
            else f"Work order submitted by {current_user.user_role}"
        ),
        )

    database.add(audit_record)
    database.commit()
    database.refresh(work_order)

    return to_work_order_read(work_order)

### Approve Work Order ###

@router.post(
    "/api/work-orders/{work_order_number}/approve-president",
    response_model=WorkOrderRead,
)

def approve_work_order_by_president(
    work_order_number: str,
    current_user: User = Depends(require_roles("President")),
    database: Session = Depends (get_db),
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

    if work_order.status != "Pending President Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order is not pending president approval",
        )

    if work_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The Work Order creator cannot approve it"
        )

    work_order.status = "Pending Treasurer Approval"

    audit_record = AuditLog(
            account_id=current_user.account_id,
            user_id=current_user.auth_user_id,
            user_name=f"{current_user.first_name} {current_user.last_name}",
            user_role=current_user.user_role,
            action="Approved Work Order",
            table_name="work_orders",
            record_id=work_order.work_order_number,
            details=f"Approved",
            )
    
    database.add(audit_record)
    database.commit()
    database.refresh(work_order)

    return to_work_order_read(work_order)

@router.post(
    "/api/work-orders/{work_order_number}/approve-treasurer",
    response_model=WorkOrderRead,
)

def approve_work_order_by_treasurer(
    work_order_number: str,
    current_user: User = Depends(require_roles("Treasurer")),
    database: Session = Depends (get_db),
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

    if work_order.status != "Pending Treasurer Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order is not pending treasurer approval",
        )

    if work_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The Work Order creator cannot approve it",
        )

    needs_board_approval = (
        work_order.type == "Emergency"
        or work_order.priority == "High"
        or work_order.amount >= Decimal("10000.00")

    )

    if needs_board_approval:
        work_order.status = "Pending Board Member Approval"
    else:
        work_order.status = "Approved"

    audit_record = AuditLog(
                account_id=current_user.account_id,
                user_id=current_user.auth_user_id,
                user_name=f"{current_user.first_name} {current_user.last_name}",
                user_role=current_user.user_role,
                action="Approved Work Order",
                table_name="work_orders",
                record_id=work_order.work_order_number,
                details=f"Approved",
                )
        
    database.add(audit_record)
    database.commit()
    database.refresh(work_order)

    return to_work_order_read(work_order)

@router.post(
    "/api/work-orders/{work_order_number}/approve-board_member",
    response_model=WorkOrderRead,
)

def approve_work_order_by_board_member(
    work_order_number: str,
    current_user: User = Depends(require_roles("Board Member")),
    database: Session = Depends (get_db),
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

    if work_order.status != "Pending Board Member Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order is not pending board member approval",
        )

    if work_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The Work Order creator cannot approve it"
        )

    is_emergency = (
        work_order.type == "Emergency"
    )
    
    if is_emergency:
        work_order.status = "Needs emergency information"
    else:
        work_order.status = "In Progress"

    audit_record = AuditLog(
                account_id=current_user.account_id,
                user_id=current_user.auth_user_id,
                user_name=f"{current_user.first_name} {current_user.last_name}",
                user_role=current_user.user_role,
                action="Approved Work Order",
                table_name="work_orders",
                record_id=work_order.work_order_number,
                details=f"Approved",
                )
        
    database.add(audit_record)

    database.commit()
    database.refresh(work_order)

    return to_work_order_read(work_order)

### Reject Work Order ###

@router.post(
    "/api/work-orders/{work_order_number}/reject-president",
    response_model=WorkOrderRead,
)

def reject_work_order_by_president(
    work_order_number: str,
    current_user: User = Depends(require_roles("President")),
    database: Session = Depends (get_db),
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

    if work_order.status != "Pending President Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order is not pending president approval",
        )

    if work_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The Work Order creator cannot reject it"
        )

    work_order.status = "Rejected by President"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Rejected work order",
        table_name="work_orders",
        record_id=work_order.work_order_number,
        details=f"Rejected",
        )

    database.add(audit_record)
    database.commit()
    database.refresh(work_order)

    return to_work_order_read(work_order)

@router.post(
    "/api/work-orders/{work_order_number}/reject-treasurer",
    response_model=WorkOrderRead,
)

def reject_work_order_by_treasurer(
    work_order_number: str,
    current_user: User = Depends(require_roles("Treasurer")),
    database: Session = Depends (get_db),
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

    if work_order.status != "Pending Treasurer Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order is not pending treasurer approval",
        )

    if work_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The Work Order creator cannot approve it"
        )

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Rejected work order",
        table_name="work_orders",
        record_id=work_order.work_order_number,
        details=f"Work order rejected by Treasurer",
        )

    database.add(audit_record)
    database.commit()
    database.refresh(work_order)

    return to_work_order_read(work_order)

@router.post(
    "/api/work-orders/{work_order_number}/reject-board_member",
    response_model=WorkOrderRead,
)

def reject_work_order_by_board_member(
    work_order_number: str,
    current_user: User = Depends(require_roles("Board Member")),
    database: Session = Depends (get_db),
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

    if work_order.status != "Pending Board Member Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order is not pending board member approval",
        )

    if work_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The Work Order creator cannot reject it"
        )

    work_order.status = "Rejected by board member"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Rejected work order",
        table_name="work_orders",
        record_id=work_order.work_order_number,
        details=f"Work order rejected by Board Member",
        )

    database.add(audit_record)
    database.commit()
    database.refresh(work_order)

    return to_work_order_read(work_order)

### Read Work Order ###

@router.get(
    "/api/work-orders",
    response_model=list[WorkOrderRead],
)

def read_work_orders(
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    if current_user is None:
        raise HTTPException(
            status_code=404,
            detail="COMS User not found"
        )

    statement = select(WorkOrder).where(
        WorkOrder.account_id == current_user.account_id
        )

    records = database.scalars(statement).all()

    return records 
