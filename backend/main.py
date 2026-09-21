from datetime import datetime
from decimal import Decimal
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from auth import get_supabase_user

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from database import get_db
from models import (BuildingAccount, User,
                    WorkOrder, Supplier,
                    EmergencyWorkOrder, WorkCompletion, AuditLog)
from schemas import (AuditLogCreate, AuditLogRead, BuildingAccountCreate, BuildingAccountRead,
                    UserCreate, UserRead,
                    WorkOrderCreate, WorkOrderRead,
                    SupplierCreate, SupplierRead,
                    WorkCompletionCreate,WorkCompletionRead,
                    WorkEmergencyCreate, WorkEmergencyRead)

app = FastAPI(title="COMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "COMS API is running"}

#######################################
#Me
#######################################

@app.get("/api/me")
def read_me(
    supabase_user = Depends(get_supabase_user),
    database: Session = Depends(get_db),
):
    statement = select(User).where(
        User.auth_user_id == supabase_user.id
    )

    user = database.scalar(statement)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="COMS User not found"
        )

    return{
        "auth_user_id": supabase_user.id,
        "email": supabase_user.email,
        "user_name": user.user_name,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "user_role": user.user_role,
        "status": user.status,
    }
    
#######################################
#Get current user  
#######################################

def get_current_user(request_user = Depends(get_supabase_user),
                      database: Session = Depends(get_db)) -> User:
    statement = select(User).where(
        User.auth_user_id == request_user.id
    )
    current_user = database.scalar(statement)

    if current_user.status != "Active":
        raise HTTPException(
            status_code=403,
            detail="COMS User is not active"
        )

    if current_user.status is None:
        raise HTTPException(
            status_code=403,
            detail="COMS User not found"
        )

    return current_user

def require_roles(*allowed_roles: str):
    def role_checker(
            current_user: User = Depends(get_current_user)):

        if current_user.user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="User does not have the required role"
            )
        return current_user
    return role_checker

#######################################
#Building Account
#######################################
def to_building_account_read(record: BuildingAccount) ->BuildingAccountRead:
    return BuildingAccountRead(
        database_id=record.database_id,
        account_id=record.account_id,
        account_name=record.account_name,
        building_name=record.building_name,
        building_address=record.building_address,
        account_status=record.account_status,
        created_at=record.created_at,
    )

@app.post (
        "/api/building-accounts",
        response_model=BuildingAccountRead,
        status_code=201,
)

def create_building_account(
    building_account: BuildingAccountCreate,
    database: Session = Depends(get_db),
):
    record = BuildingAccount(
        account_id=building_account.account_id,
        account_name=building_account.account_name,
        building_name=building_account.building_name,
        building_address=building_account.building_address,
        account_status=building_account.account_status,
    )

    database.add(record)
    database.commit()
    database.refresh(record)

    return to_building_account_read(record)

@app.get (
        "/api/building-accounts",
        response_model=list[BuildingAccountRead],
)

def read_building_account(
    database: Session = Depends(get_db)
):
    statement =select(BuildingAccount).order_by(
        BuildingAccount.database_id
    )

    records =database.scalars(statement).all()

    return[
        to_building_account_read(record)
        for record in records
    ]

#######################################
#User   
#######################################

def to_user_read(record: User) ->UserRead:
    return UserRead(
        database_id=record.database_id,
        account_id=record.account_id,
        user_name=record.user_name,
        email=record.email,
        first_name=record.first_name,
        last_name=record.last_name,
        user_role=record.user_role,
        status=record.status,
        created_at=record.created_at,
        updated_at=record.updated_at,
        last_login_at= record.last_login_at,
    )

@app.post (
        "/api/users",
        response_model=UserRead,
        status_code=201,
)

def create_user(
    user : UserCreate,
    current_user: User = Depends(require_roles("Admin")),
    database: Session = Depends(get_db),
):
    statement = select (BuildingAccount).where(
        BuildingAccount.account_id == user.account_id
    )

    building_account = database.scalar(statement)

    if building_account is None:
        raise HTTPException(
            status_code=404,
            detail= "Building account not found"

        )
    
    record = User(
   #    account_database_id=building_account.account_database_id,
        account_id = current_user.account_id,
        user_name=user.user_name,
        email=user.email,
        #
        auth_user_id=user.auth_user_id,
        #
        first_name=user.first_name,
        last_name=user.last_name,
        user_role=user.user_role,
        status=user.status,
    )

    database.add(record)
    database.commit()
    database.refresh(record)

    return to_user_read(record)

@app.get (
        "/api/users",
        response_model=list[UserRead],
)

def read_user( 
    current_user: User = Depends(require_roles("Admin")),
    database: Session = Depends(get_db),

):
    statement = ( select(User)
    .where(User.account_id == current_user.account_id)
    .order_by(User.database_id)
     )

    records =database.scalars(statement).all()

    return[
        to_user_read(record)
        for record  in records
    ]

#######################################
#Work order
#######################################

def to_work_order_read(record: WorkOrder) -> WorkOrderRead:
    return WorkOrderRead(
        database_id=record.database_id,
        account_id=record.account_id,
        created_by_user_id=record.created_by_user_id,
        work_order_number=record.work_order_number,
        #
        status=record.status,
        title=record.title,
        supplier=record.supplier,
        amount=record.amount,
        priority=record.priority,
        type=record.type,
        category=record.category,
        location=record.location,
        target_date=record.target_date,
        description=record.description,
    )

@app.post(
    "/api/work-orders",
    response_model=WorkOrderRead,
    status_code=201,
)

def create_work_order(
    work_order: WorkOrderCreate,
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
    database: Session = Depends(get_db),
):

    record = WorkOrder(

        account_id=current_user.account_id,
        status="Draft",
        created_year=datetime.now().year,
        title=work_order.title,
        supplier=work_order.supplier,
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

    record.work_order_number = (
        f"WO-{record.created_year}-"
        f"{record.database_id:04d}"
    )

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

@app.post(
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

    work_order.status = "Pending President Approval"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Submitted work order",
        table_name="work_orders",
        record_id=work_order.work_order_number,
        details=f"Work order submitted by {current_user.user_role}",
        )

    database.add(audit_record)
    database.commit()
    database.refresh(work_order)

    return to_work_order_read(work_order)

### Approve Work Order ###

@app.post(
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

@app.post(
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

@app.post(
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

### Reject Work Order ###

@app.post(
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

@app.post(
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

@app.post(
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

@app.get(
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

#######################################
#Work order emergency
#######################################

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

@app.post(
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

@app.get(
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

#######################################
#Work order completion
#######################################

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

@app.post(
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

@app.get(
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

@app.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_id}/approve-president",
    response_model=WorkCompletionRead,
)

def approve_work_completion_by_president(
    work_order_number: str,
    completion_id: int,
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
            WorkCompletion.database_id == completion_id,
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

@app.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_id}/approve-treasurer",
    response_model=WorkCompletionRead,
)

def approve_work_completion_by_treasurer(
    work_order_number: str,
    completion_id: int,
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
            WorkCompletion.database_id == completion_id,
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

@app.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_id}/approve-board-member",
    response_model=WorkCompletionRead,
)

def approve_work_completion_by_board_member(
    work_order_number: str,
    completion_id: int,
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
            WorkCompletion.database_id == completion_id,
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

@app.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_id}/reject-president",
    response_model=WorkCompletionRead,
)

def reject_work_completion_by_president(
    work_order_number: str,
    completion_id: int,
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
            WorkCompletion.database_id == completion_id,
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

@app.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_id}/reject-treasurer",
    response_model=WorkCompletionRead,
)

def reject_work_completion_by_treasurer(
    work_order_number: str,
    completion_id: int,
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
            WorkCompletion.database_id == completion_id,
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

@app.post(
    "/api/work-orders/{work_order_number}/WO-completion/{completion_id}/reject-board-member",
    response_model=WorkCompletionRead,
)

def reject_work_completion_by_board_member(
    work_order_number: str,
    completion_id: int,
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
            WorkCompletion.database_id == completion_id,
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


#######################################
#Supplier
#######################################

def to_supplier_read(record: Supplier) -> SupplierRead:
    return SupplierRead(
        database_id=record.database_id,
        account_id=record.account_id,
        status=record.status,
        created_by_user_id=record.created_by_user_id,
        supplier_id=record.supplier_id,
        supplier_type=record.supplier_type,
        supplier_name=record.supplier_name,
        service_category=record.service_category,
        contact=record.contact,
        phone=record.phone,
        email=record.email,
        rfc=record.rfc,
        address=record.address,
        clabe=record.clabe,
        payment_method=record.payment_method,
        notes=record.notes,
        created_at=record.created_at,
    )

@app.post(
    "/api/suppliers",
    response_model=SupplierRead,
    status_code= 201,
    )

def create_supplier(
    supplier: SupplierCreate,
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
    database:  Session =Depends(get_db),
):

    record = Supplier(
    account_id =current_user.account_id,
    created_by_user_id = current_user.database_id,
    status="Draft",
    supplier_type=supplier.supplier_type,
    supplier_name=supplier.supplier_name,
    service_category=supplier.service_category,
    contact=supplier.contact,
    phone=supplier.phone,
    email=supplier.email,
    rfc=supplier.rfc,
    address=supplier.address,
    clabe=supplier.clabe,
    payment_method=supplier.payment_method,
    notes=supplier.notes,
)
    database.add(record)
    database.flush()

    record.supplier_id =(
        f"SUP-{datetime.now().year}-"
        f"{record.database_id:04d}"
    )

    audit_record = AuditLog(
    account_id=current_user.account_id,
    user_id=current_user.auth_user_id,
    user_name=f"{current_user.first_name} {current_user.last_name}",
    user_role=current_user.user_role,
    action="Created supplier",
    table_name="suppliers",
    record_id=record.supplier_id,
    details=f"Supplier created by {current_user.user_role}",
    )
    database.add(audit_record)

    database.commit()
    database.refresh(record)

    return to_supplier_read(record)

@app.get(
    "/api/suppliers",
    response_model=list[SupplierRead],
)

def read_supplier (
    supabase_user = Depends(get_supabase_user),
    database: Session = Depends(get_db),
):
    user_statement = select(User).where(
        User.auth_user_id == supabase_user.id
    )
    current_user = database.scalar(user_statement)

    if current_user is None:
        raise HTTPException(
            status_code=404,
            detail="COMS User not found"
        )

    statement = select(Supplier).where(
        Supplier.account_id == current_user.account_id
    )   

    records = database.scalars(statement).all()

    return records

@app.post(
    "/api/suppliers/{supplier_id}/submit",
    response_model=SupplierRead,
)

def submit_supplier(
    supplier_id: str,
    current_user: User = Depends(
        require_roles("Admin", "Manager", "Staff")
    ),
    database: Session = Depends(get_db),
):
    supplier_record = database.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.account_id == current_user.account_id,
        )
    )

    if supplier_record is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found",
        )

    if supplier_record.status != "Draft":
        raise HTTPException(
            status_code=409,
            detail="Only Draft suppliers can be submitted",
        )

    if supplier_record.created_by_user_id != current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Only the Supplier creator can submit it",
        )

    supplier_record.status = "Pending President Approval"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Submitted supplier",
        table_name="suppliers",
        record_id=supplier_record.supplier_id,
        details=f"Supplier submitted by {current_user.user_role}.",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(supplier_record)

    return to_supplier_read(supplier_record)
        
#Supplier approve

@app.post(
    "/api/suppliers/{supplier_id}/approve-president",
    response_model= SupplierRead,
)

def approve_supplier_by_president(
    supplier_id: str,
    current_user:User = Depends(require_roles("President")),
    database: Session = Depends(get_db),
):
    supplier_record = database.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.account_id == current_user.account_id,
        )
    )

    if supplier_record is None:
        raise HTTPException (
        status_code= 404,
        detail= "Supplier not found",
    )

    if supplier_record.status != "Pending President Approval":
        raise HTTPException (
        status_code= 409,
        detail= "Supplier is not pending for president approval",
    )

    if supplier_record.created_by_user_id == current_user.database_id:
        raise HTTPException (
        status_code= 403,
        detail= "Supplier creator cannot approve it",
    )

    supplier_record.status = "Pending Treasurer Approval"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Approved supplier",
        table_name="suppliers",
        record_id=supplier_record.supplier_id,
        details="Approved",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(supplier_record)

    return to_supplier_read(supplier_record)

@app.post(
    "/api/suppliers/{supplier_id}/approve-treasurer",
    response_model=SupplierRead,
)

def approve_supplier_by_treasurer(
    supplier_id: str,
    current_user: User = Depends(require_roles("Treasurer")),
    database: Session = Depends(get_db),
):
    supplier_record = database.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.account_id == current_user.account_id,
        )
    )

    if supplier_record is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found",
        )

    if supplier_record.status != "Pending Treasurer Approval":
        raise HTTPException(
            status_code=409,
            detail="Supplier is not pending Treasurer approval",
        )

    if supplier_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Supplier creator cannot approve it",
        )

    supplier_record.status = "Pending Board Member Approval"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Approved supplier",
        table_name="suppliers",
        record_id=supplier_record.supplier_id,
        details="Approved",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(supplier_record)

    return to_supplier_read(supplier_record)    

@app.post(
    "/api/suppliers/{supplier_id}/approve-board-member",
    response_model= SupplierRead,
)

def approve_supplier_by_board_member(
    supplier_id: str,
    current_user: User = Depends(require_roles("Board Member")),
    database: Session = Depends(get_db),
):
    supplier_record = database.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.account_id == current_user.account_id,
        )
    )   

    if supplier_record is None:
        raise HTTPException (
            status_code= 404,
            detail= "Supplier not found"
        )

    if supplier_record.status != "Pending Board Member Approval":
        raise HTTPException (
        status_code= 409,
        detail= "Supplier is not pending for Board Member approval",
    )

    if supplier_record.created_by_user_id == current_user.database_id:
        raise HTTPException (
        status_code= 403,
        detail= "Supplier creator cannot approve it",
    )

    supplier_record.status = "Approved"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_role=current_user.user_role,
        action="Approved supplier",
        table_name="suppliers",
        record_id=supplier_record.supplier_id,
        details="Approved",
    )

    database.add(audit_record)
    database.commit()
    database.refresh(supplier_record)

    return to_supplier_read(supplier_record)

#Supplier reject

@app.post(
    "/api/suppliers/{supplier_id}/reject-president",
    response_model= SupplierRead,
)

def reject_supplier_by_president(
    supplier_id: str,
    current_user: User = Depends(require_roles("President")),
    database: Session = Depends(get_db),
):
    supplier_record = database.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.account_id == current_user.account_id,
        )
    )

    if supplier_record is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )

    if supplier_record.status != "Pending President Approval":
        raise HTTPException(
            status_code=409,
            detail="Supplier is not pending president approval",
        )

    if supplier_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The supplier creator cannot reject it",
        )

    supplier_record.status = "Rejected by President"

    audit_record = AuditLog(
    account_id=current_user.account_id,
    user_id=current_user.auth_user_id,
    user_name=f"{current_user.first_name} {current_user.last_name}",
    user_role=current_user.user_role,
    action="Rejected supplier",
    table_name="suppliers",
    record_id=supplier_record.supplier_id,
    details="Rejected",
    )

    database.add(audit_record)

    database.commit()
    database.refresh(supplier_record)

    return to_supplier_read(supplier_record)

@app.post(
    "/api/suppliers/{supplier_id}/reject-treasurer",
    response_model= SupplierRead,
)

def reject_supplier_by_treasurer(
    supplier_id: str,
    current_user: User = Depends(require_roles("Treasurer")),
    database: Session = Depends(get_db),
):
    supplier_record = database.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.account_id == current_user.account_id,
        )
    )

    if supplier_record is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )

    if supplier_record.status != "Pending Treasurer Approval":
        raise HTTPException(
            status_code=409,
            detail="Supplier is not pending treasurer approval",
        )

    if supplier_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The supplier creator cannot reject it",
        )

    supplier_record.status = "Rejected"

    audit_record = AuditLog(
    account_id=current_user.account_id,
    user_id=current_user.auth_user_id,
    user_name=f"{current_user.first_name}, {current_user.last_name}",
    user_role=current_user.user_role,
    action="Rejected supplier",
    table_name="suppliers",
    record_id=supplier_record.supplier_id,
    details="Rejected by Treasurer",
    )

    database.add(audit_record)

    database.commit()
    database.refresh(supplier_record)

    return to_supplier_read(supplier_record)

@app.post(
    "/api/suppliers/{supplier_id}/reject-board-member",
    response_model= SupplierRead,
)

def reject_supplier_by_board_member(
    supplier_id: str,
    current_user: User = Depends(require_roles("Board Member")),
    database: Session = Depends(get_db),
):
    supplier_record = database.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.account_id == current_user.account_id,
        )
    )

    if supplier_record is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found",
        )

    if supplier_record.status != "Pending Board Member Approval":
        raise HTTPException(
            status_code=409,
            detail="Supplier is not pending Board Member approval",
        )

    if supplier_record.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="The supplier creator cannot reject it",
        )

    supplier_record.status = "Rejected"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=f"{current_user.first_name}, {current_user.last_name}",
        user_role=current_user.user_role,
        action="Rejected supplier",
        table_name="suppliers",
        record_id=supplier_record.supplier_id,
        details="Rejected by Board member",
        )
    
    database.add(audit_record)
    
    database.commit()
    database.refresh(supplier_record)

    return to_supplier_read(supplier_record)

#################################
#Audit log
#################################

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

@app.get(
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

@app.get(
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