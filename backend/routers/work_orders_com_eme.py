from decimal import Decimal
from fastapi import Depends, HTTPException, APIRouter

from sqlalchemy import func, or_, select, update, Integer, cast, func
from sqlalchemy.orm import Session

from database import get_db
from users import require_roles
from models import ( User,
                    WorkOrder,
                    EmergencyWorkOrder, WorkCompletion, AuditLog)

from schemas import (
                    WorkCompletionCreate,WorkCompletionRead,
                    WorkEmergencyCreate, WorkEmergencyRead,)

from auth import get_supabase_user

router = APIRouter()

def to_work_emergency_read(record: EmergencyWorkOrder) -> WorkEmergencyRead:

    return WorkEmergencyRead(

        database_id=record.database_id,
        emergency_number=record.emergency_number,
        work_order_id=record.work_order_id,
        created_at=record.created_at,
        status=record.status,
        created_by_user_id=record.created_by_user_id,
        wo_emergency_what=record.wo_emergency_what,
        wo_emergency_where=record.wo_emergency_where,
        wo_emergency_when=record.wo_emergency_when,
        wo_emergency_who=record.wo_emergency_who,
        wo_emergency_why=record.wo_emergency_why,
        wo_emergency_howmany=record.wo_emergency_howmany,
        wo_emergency_howmuch=record.wo_emergency_howmuch,
    )

@router.post(
    "/api/work-orders/{work_order_number}/WO-emergency",
    response_model= WorkEmergencyRead,
    status_code= 201
    )

def create_work_emergency(
    work_order_number:str,
    emergency: WorkEmergencyCreate,
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
    database: Session = Depends(get_db),
    
):
    work_order = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number,
            WorkOrder.account_id == current_user.account_id
        )
    )

    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )

    if work_order.type != "Emergency":
        raise HTTPException(
        status_code=409,
        detail="Emergency information is only allowed for emergency work orders",
    )

    if work_order.status != "Needs Emergency Information":
        raise HTTPException(
        status_code=409,
        detail="Work order is not waiting for emergency information",
    )

    emergency_sequence = (
        database.scalar(
            select(func.count()).select_from(EmergencyWorkOrder).where(
                EmergencyWorkOrder.work_order_id == work_order.database_id
            )
        )
        or 0
    ) + 1

    record = EmergencyWorkOrder(
        emergency_number=(
            f"{work_order.work_order_number}-E{emergency_sequence:02d}"
        ),
        work_order_id=work_order.database_id,
        status = "Submitted",
        created_by_user_id = current_user.database_id,
        wo_emergency_what=emergency.wo_emergency_what,
        wo_emergency_where=emergency.wo_emergency_where,
        wo_emergency_when=emergency.wo_emergency_when,
        wo_emergency_who=emergency.wo_emergency_who,
        wo_emergency_why=emergency.wo_emergency_why,
        wo_emergency_howmany=emergency.wo_emergency_howmany,
        wo_emergency_howmuch=emergency.wo_emergency_howmuch,
    )

    database.add(record)
    database.flush()

    work_order.status = "In Progress"
    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Created emergency work order",
        table_name="work_order_emergency",
        record_id=record.emergency_number,
        details=f"Emergency work order submitted by {current_user.user_role}",
    )

    database.add(audit_record)

    database.commit()
    database.refresh(record)

    return to_work_emergency_read (record)

### Read work emergency ###

@router.get(
    "/api/work-orders/{work_order_number}/WO-emergency",
    response_model= list[WorkEmergencyRead]
    )

def read_work_emergency(
    work_order_number:str,
    supabase_user = Depends(get_supabase_user),
    database: Session =Depends(get_db),
):
    current_user = database.scalar(select(User).where(User.auth_user_id==supabase_user.id))

    if current_user is None:
        raise HTTPException(
            status_code=404,
            detail="COMS User not found"
        )

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
    
    statement = (select(EmergencyWorkOrder)
                .where(
                EmergencyWorkOrder.work_order_id == work_order.database_id)
                .order_by(EmergencyWorkOrder.database_id) 
            )

    records = database.scalars(statement).all()


    return[
        to_work_emergency_read (record)
        for record in records
    ]

def to_work_order_completion_read (record: WorkCompletion) -> WorkCompletionRead:

    return WorkCompletionRead(
        database_id=record.database_id,
        completion_number=record.completion_number,
        work_order_id=record.work_order_id,
        created_at=record.created_at,
        status=record.status,
        created_by_user_id=record.created_by_user_id,
        work_performed_date=record.work_performed_date,
        work_performed_description=record.work_performed_description,
        work_performed_observation=record.work_performed_observation,
    )

@router.post(
        "/api/work-orders/{work_order_number}/WO-completion",
        response_model= WorkCompletionRead,
        status_code= 201,
)

def create_work_completion (
    work_order_number:str,
    completion: WorkCompletionCreate,
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
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

    completion_sequence = (
        database.scalar(
            select(func.count()).select_from(WorkCompletion).where(
                WorkCompletion.work_order_id == work_order.database_id
            )
        )
        or 0
    ) + 1

    record = WorkCompletion(
        completion_number=(
            f"{work_order.work_order_number}-C{completion_sequence:02d}"
        ),
        work_order_id=work_order.database_id,
        created_by_user_id = current_user.database_id,
        status = "Pending President Approval",
        work_performed_date= completion.work_performed_date,
        work_performed_description=completion.work_performed_description,
        work_performed_observation=completion.work_performed_observation,
    )

    database.add(record)
    database.flush()

    audit_record = AuditLog(
            account_id=current_user.account_id,
            user_id=current_user.auth_user_id,
            user_name=f"{current_user.first_name} {current_user.last_name}",
            user_role=current_user.user_role,
            action="Created work order completion",
            table_name="work_order_completion",
            record_id=record.completion_number,
            details=f"Work order completion created for President approval by {current_user.user_role}",
        )
    
    database.add(audit_record)
    database.commit()
    database.refresh(record)

    return to_work_order_completion_read (record)

@router.get(
    "/api/work-orders/{work_order_number}/WO-completion",
    response_model=list[WorkCompletionRead]
)

def read_work_completion(
    work_order_number: str,
    supabase_user=Depends(get_supabase_user),
    database: Session=Depends(get_db),
):
    current_user = database.scalar(
        select(User).where(
            User.auth_user_id == supabase_user.id
        )
    )

    if current_user is None:
        raise HTTPException(
            status_code=404,
            detail="COMS User not found"
        )

    work_order = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number,
            WorkOrder.account_id == current_user.account_id
        )
    )

    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )

    statement = (
        select(WorkCompletion)
        .where(
            WorkCompletion.work_order_id == work_order.database_id
        )
        .order_by(WorkCompletion.database_id)
    )

    records = database.scalars(statement).all()

    return [
        to_work_order_completion_read(record)
        for record in records
    ]

#Work Order completion approval

@router.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_number}/approve-president",
    response_model=WorkCompletionRead,
)

def approve_work_completion_by_president(
    work_order_number: str,
    completion_number: str,
    current_user: User = Depends(require_roles("President")),
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

    completion_record = database.scalar(
        select(WorkCompletion).where(
            WorkCompletion.completion_number == completion_number,
            WorkCompletion.work_order_id == work_order.database_id,
        )
    )

    if completion_record is None:
        raise HTTPException(
            status_code=404,
            detail="Work order completion not found",
        )

    if completion_record.status != "Pending President Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order completion is not pending for president approval",
        )

    if completion_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Work order completion creator cannot approve it",
        )

    completion_record.status = "Pending Treasurer Approval"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Approved work order completion",
        table_name="work_order_completion",
        record_id=completion_record.completion_number,
        details="Approved",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(completion_record)

    return to_work_order_completion_read(completion_record)

@router.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_number}/approve-treasurer",
    response_model=WorkCompletionRead,
)

def approve_work_completion_by_treasurer(
    work_order_number: str,
    completion_number: str,
    current_user: User = Depends(require_roles("Treasurer")),
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

    completion_record = database.scalar(
        select(WorkCompletion).where(
            WorkCompletion.completion_number == completion_number,
            WorkCompletion.work_order_id == work_order.database_id,
        )
    )

    if completion_record is None:
        raise HTTPException(
            status_code=404,
            detail="Work order completion not found",
        )

    if completion_record.status != "Pending Treasurer Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order completion is not pending for treasurer approval",
        )

    if completion_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Work order completion creator cannot approve it",
        )

    needs_board_approval = (
        work_order.type == "Emergency"
        or work_order.priority == "High"
        or work_order.amount >= Decimal("10000.00")

    )

    if needs_board_approval:
        completion_record.status = "Pending Board Member Approval"
    else:
        completion_record.status = "Approved"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Approved work order completion",
        table_name="work_order_completion",
        record_id=completion_record.completion_number,
        details="Approved",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(completion_record)

    return to_work_order_completion_read(completion_record)

@router.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_number}/approve-board-member",
    response_model=WorkCompletionRead,
)

def approve_work_completion_by_board_member(
    work_order_number: str,
    completion_number: str,
    current_user: User = Depends(require_roles("Board Member")),
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

    completion_record = database.scalar(
        select(WorkCompletion).where(
            WorkCompletion.completion_number == completion_number,
            WorkCompletion.work_order_id == work_order.database_id,
        )
    )

    if completion_record is None:
        raise HTTPException(
            status_code=404,
            detail="Work order completion not found",
        )

    if completion_record.status != "Pending Board Member Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order completion is not pending for treasurer approval",
        )

    if completion_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Work order completion creator cannot approve it",
        )

    completion_record.status = "Approved"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Approved work order completion",
        table_name="work_order_completion",
        record_id=completion_record.completion_number,
        details="Approved",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(completion_record)

    return to_work_order_completion_read(completion_record)

#Work order completion reject

@router.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_number}/reject-president",
    response_model=WorkCompletionRead,
)

def reject_work_completion_by_president(
    work_order_number: str,
    completion_number: str,
    current_user: User = Depends(require_roles("President")),
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

    completion_record = database.scalar(
        select(WorkCompletion).where(
            WorkCompletion.completion_number == completion_number,
            WorkCompletion.work_order_id == work_order.database_id,
        )
    )

    if completion_record is None:
        raise HTTPException(
            status_code=404,
            detail="Work order completion not found",
        )

    if completion_record.status != "Pending President Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order completion is not pending for president approval",
        )
    
    if completion_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Work order completion creator cannot reject it",
        )

    completion_record.status = "Rejected by president"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Rejected work order completion",
        table_name="work_order_completion",
        record_id=completion_record.completion_number,
        details="Rejected",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(completion_record)

    return to_work_order_completion_read(completion_record)

@router.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_number}/reject-treasurer",
    response_model=WorkCompletionRead,
)

def reject_work_completion_by_treasurer(
    work_order_number: str,
    completion_number: str,
    current_user: User = Depends(require_roles("Treasurer")),
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

    completion_record = database.scalar(
        select(WorkCompletion).where(
            WorkCompletion.completion_number == completion_number,
            WorkCompletion.work_order_id == work_order.database_id,
        )
    )

    if completion_record is None:
        raise HTTPException(
            status_code=404,
            detail="Work order completion not found",
        )

    if completion_record.status != "Pending Treasurer Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order completion is not pending for treasurer approval",
        )

    if completion_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Work order completion creator cannot reject it",
        )

    completion_record.status = "Rejected by treasurer"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Reject work order completion",
        table_name="work_order_completion",
        record_id=completion_record.completion_number,
        details="Work order completion rejected by Treasurer",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(completion_record)

    return to_work_order_completion_read(completion_record)

@router.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_number}/reject-board-member",
    response_model=WorkCompletionRead,
)

def reject_work_completion_by_board_member(
    work_order_number: str,
    completion_number: str,
    current_user: User = Depends(require_roles("Board Member")),
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

    completion_record = database.scalar(
        select(WorkCompletion).where(
            WorkCompletion.completion_number == completion_number,
            WorkCompletion.work_order_id == work_order.database_id,
        )
    )

    if completion_record is None:
        raise HTTPException(
            status_code=404,
            detail="Work order completion not found",
        )

    if completion_record.status != "Pending Board Member Approval":
        raise HTTPException(
            status_code=409,
            detail="Work order completion is not pending for board member approval",
        )
    
    if completion_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Work order completion creator cannot approve it",
        )

    completion_record.status = "Rejected"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Rejected work order completion",
        table_name="work_order_completion",
        record_id=completion_record.completion_number,
        details="Work order completion rejected by Board Member",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(completion_record)

    return to_work_order_completion_read(completion_record)

