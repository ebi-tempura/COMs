import logging

from datetime import datetime
from fastapi import Depends,HTTPException,APIRouter, APIRouter


from sqlalchemy import func, select,  Integer, cast, func
from sqlalchemy.orm import Session

from database import get_db

from users import require_roles
from models import (User,
                    Supplier,
                     AuditLog)

from schemas import (
                    SupplierCreate, SupplierRead,
                    )

from auth import get_supabase_user

router = APIRouter(    
    prefix="/api/suppliers",
    tags=["Suppliers"],
    )

audit_logger = logging.getLogger(__name__)


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

@router.post(
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
    year_prefix = f"SUP-{datetime.now().year}-"

    last_number = (
        database.query(
            func.max(
                cast(
                    func.substr(Supplier.supplier_id, len(year_prefix) + 1),
                    Integer,
                )
            )
        )
        .filter(
            Supplier.account_id == current_user.account_id,
            Supplier.supplier_id.like(f"{year_prefix}%"),
        )
        .scalar()
    )

    next_number = (last_number or 0) + 1
    record.supplier_id = f"{year_prefix}{next_number:04d}"

    database.add(record)
    database.flush()

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

@router.get(
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

@router.post(
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

@router.post(
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

@router.post(
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

@router.post(
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

@router.post(
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

@router.post(
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

@router.post(
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
