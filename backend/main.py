from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import (BuildingAccount, User,
                    WorkOrder, Supplier,
                    EmergencyWorkOrder, WorkCompletion)
from schemas import (BuildingAccountCreate, BuildingAccountRead,
                    UserCreate, UserRead,
                    WorkOrderCreate, WorkOrderRead,
                    SupplierCreate, SupplierRead,
                    WorkCompletionCreate,WorkCompletionRead,
                    WorkEmergencyCreate, WorkEmergencyRead)

app = FastAPI(title="COMS API")

@app.get("/")
def read_root():
    return {"message": "COMS API is running"}

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
        #database_id=building_account.database_id,
        account_name=building_account.account_name,
        building_name=building_account.building_name,
        building_address=building_account.building_address,
        account_status=building_account.account_status,
        #created_at=building_account.created_at,  
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
        account_id = building_account.account_id,
        user_name=user.user_name,
        email=user.email,
        password_hash=user.password,
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
    database: Session = Depends(get_db)
):
    statement =select(User).order_by(
        User.database_id
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
    database: Session = Depends(get_db),
):
    statement = select(BuildingAccount).where(
        BuildingAccount.account_id == work_order.account_id
    )

    building_account= database.scalar(statement)

    if building_account is None:
        raise HTTPException(
            status_code=404,
            detail="Building account not found"
        )
    
    record = WorkOrder(

        account_id=building_account.account_id,
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
    )

    database.add(record)
    database.flush()

    record.work_order_number = (
        f"WO-{record.created_year}-"
        f"{record.database_id:04d}"
    )

    database.commit()
    database.refresh(record)

    return to_work_order_read(record)

@app.get(
    "/api/work-orders",
    response_model=list[WorkOrderRead],
)

def read_work_orders(
    database: Session = Depends(get_db),
):
    statement = select(WorkOrder).order_by(
        WorkOrder.database_id
    )

    records = database.scalars(statement).all()

    return [
        to_work_order_read(record)
        for record in records
    ]

#######################################
#Supplier
#######################################
def to_supplier_read(record: Supplier) -> SupplierRead:
    return SupplierRead(
        database_id=record.database_id,
        account_id=record.account_id,
        #
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
    database:  Session =Depends(get_db),
):
    statement = select(BuildingAccount).where(
        BuildingAccount.account_id == supplier.account_id
    )
    building_account = database.scalar(statement)

    if building_account is None:
        raise HTTPException(
            status_code=404,
            detail="Building account not found"
        )
    
    record = Supplier(

    account_id =building_account.account_id,
    #    
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

    database.commit()
    database.refresh(record)

    return to_supplier_read(record)

@app.get(
    "/api/suppliers",
    response_model=list[SupplierRead],
)

def read_supplier (
    database: Session = Depends(get_db),
):
    statement = select (Supplier).order_by(
        Supplier.database_id)

    records = database.scalars(statement).all()

    return[
        to_supplier_read(record)
        for record in records
    ]

#######################################
#Work order emergency
#######################################

def to_work_emergency_read(record: EmergencyWorkOrder) -> WorkEmergencyRead:

    return WorkEmergencyRead(

        database_id=record.database_id,
        work_order_id=record.work_order_id,
        created_at=record.created_at,
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
    database: Session = Depends(get_db)
):

    work_order = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number
        )
    )
    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )

    record = EmergencyWorkOrder(
        work_order_id=work_order.database_id,
        wo_emergency_what=emergency.wo_emergency_what,
        wo_emergency_where=emergency.wo_emergency_where,
        wo_emergency_when=emergency.wo_emergency_when,
        wo_emergency_who=emergency.wo_emergency_who,
        wo_emergency_why=emergency.wo_emergency_why,
        wo_emergency_howmany=emergency.wo_emergency_howmany,
        wo_emergency_howmuch=emergency.wo_emergency_howmuch,
    )

    database.add(record)
    database.commit()
    database.refresh(record)

    return to_work_emergency_read (record)

@app.get(
    "/api/work-orders/{work_order_id}/WO-emergency",
    response_model= list[WorkEmergencyRead]
    )

def read_work_emergency(
    work_order_id:str,
    database: Session =Depends(get_db),
):
    statement = (select (EmergencyWorkOrder)
                 .where(
        EmergencyWorkOrder.work_order_id == work_order_id).order_by(EmergencyWorkOrder.database_id)
)
    records = database.scalars(statement).all()

    return[
        to_work_emergency_read(record)
        for record in records
    ]

#######################################
#Work order completion
#######################################

def to_work_order_completion_read (record: WorkCompletion) -> WorkCompletionRead:

    return WorkCompletionRead(
        database_id=record.database_id,
        work_order_id=record.work_order_id,
        created_at=record.created_at,
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
    database: Session = Depends (get_db),
): 
    work_order = database.scalar(
        select(WorkOrder).where(
            WorkOrder.work_order_number == work_order_number
        )
    )
    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found",
        )


    record = WorkCompletion(
        work_order_id=work_order.work_order_id,
        work_performed_date= completion.work_performed_date,
        work_performed_description=completion.work_performed_description,
        work_performed_observation=completion.work_performed_observation,
    )

    database.add(record)
    database.commit()
    database.refresh(record)

    return to_work_order_completion_read (record)

@app.get(
    "/api/work-orders/{work_order_number}/WO-completion",
    response_model= list[WorkCompletionRead]
    )

def read_work_completion(
    work_order_id:str,
    database: Session = Depends(get_db),
):
    statement = (select(WorkCompletion)
                .where(                    
                WorkCompletion.work_order_id == work_order_id).order_by(WorkCompletion.database_id)

)
    records = database.scalars(statement).all()

    return[
        to_work_order_completion_read (record)
        for record in records
    ]

#######################################
#######################################
