from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from database import get_db
from models import (
    AuditLog,
    PurchaseOrder,
    PurchaseOrderSequence,
    Supplier,
    User,
    WorkOrder,
)
from schemas import (
    PurchaseOrderCreate,
    PurchaseOrderRead,
    PurchaseOrderReject,
)
from users import require_roles

router = APIRouter(
    prefix="/api/purchase-orders",
    tags=["Purchase Orders"],
)

BOARD_THRESHOLD = Decimal("10000.00")

def get_purchase_order_or_404(
    database: Session,
    account_id: str,
    purchase_order_number: str,
) -> PurchaseOrder:
    purchase_order = database.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.account_id == account_id,
            PurchaseOrder.purchase_order_number
            == purchase_order_number,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    return purchase_order

def get_related_records(
    database: Session,
    purchase_order: PurchaseOrder,
) -> tuple[WorkOrder | None, Supplier]:

    work_order=None

    if purchase_order.work_order_id is not None:
        work_order = database.scalar(
            select(WorkOrder).where(
                WorkOrder.account_id == purchase_order.account_id,
                WorkOrder.database_id == purchase_order.work_order_id,
            )
        )

        if work_order is None:
            raise HTTPException(
                status_code=409,
                detail="Purchase order has an invalid related work order",
            )

    supplier = database.scalar(
        select(Supplier).where(
            Supplier.account_id == purchase_order.account_id,
            Supplier.database_id == purchase_order.supplier_database_id,
        )
    )

    if supplier is None:
        raise HTTPException(
            status_code=409,
            detail="Purchase order has an invalid related supplier",
        )

    return work_order, supplier

def to_purchase_order_read(
    purchase_order: PurchaseOrder,
    work_order: WorkOrder | None,
    supplier: Supplier,
) -> PurchaseOrderRead:
    
    return PurchaseOrderRead(
        database_id=purchase_order.database_id,
        account_id=purchase_order.account_id,
        purchase_order_number=purchase_order.purchase_order_number,
        title=purchase_order.title,
        priority=purchase_order.priority, 
        created_year=purchase_order.created_year,
        work_order_number=(work_order.work_order_number if work_order is not None else None),
        supplier_id=supplier.supplier_id,
        description=purchase_order.description,
        amount=purchase_order.amount,
        status=purchase_order.status,
        created_at=purchase_order.created_at,
        created_by_user_id=purchase_order.created_by_user_id,
    )

def add_po_audit(
    database: Session,
    current_user: User,
    purchase_order: PurchaseOrder,
    action: str,
    details: str,
) -> None:
    # Match these keyword names to your existing AuditLog model.
    # In particular, verify user_id and user_name.
    database.add(
        AuditLog(
            account_id=current_user.account_id,
            user_id=current_user.auth_user_id,
            user_name=current_user.user_name,
            action=action,
            user_role=current_user.user_role,
            table_name="purchase_orders",
            record_id=purchase_order.purchase_order_number,
            details=details,
            work_order_id=purchase_order.work_order_id,
        )
    )

def ensure_not_creator(
    purchase_order: PurchaseOrder,
    current_user: User,
) -> None:
    if purchase_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Creator cannot approve or reject their own purchase order",
        )

def next_po_number(
    database: Session,
    account_id: str,
    year: int,
) -> str:
    # SQLite UPSERT and RETURNING allocate the next account/year number
    # within the current database transaction.
    statement = (
        sqlite_insert(PurchaseOrderSequence)
        .values(
            account_id=account_id,
            created_year=year,
            last_number=1,
        )
        .on_conflict_do_update(
            index_elements=[
                PurchaseOrderSequence.account_id,
                PurchaseOrderSequence.created_year,
            ],
            set_={
                "last_number":
                    PurchaseOrderSequence.last_number + 1,
            },
        )
        .returning(PurchaseOrderSequence.last_number)
    )

    sequence = database.scalar(statement)

    if sequence > 9999:
        raise HTTPException(
            status_code=409,
            detail="Purchase order sequence exhausted for this year",
        )

    return f"PO-{year}-{sequence:04d}"

def commit_and_read(
    database: Session,
    purchase_order: PurchaseOrder,
) -> PurchaseOrderRead:
    work_order, supplier = get_related_records(
        database,
        purchase_order,
    )
    result = to_purchase_order_read(
        purchase_order,
        work_order,
        supplier,
    )
    database.commit()
    return result

@router.post(
    "",
    response_model=PurchaseOrderRead,
    status_code=status.HTTP_201_CREATED,
)

def create_purchase_order(
    payload: PurchaseOrderCreate,
    current_user: User = Depends(
        require_roles("Admin", "Manager", "Staff")
    ),
    database: Session = Depends(get_db),
):
    work_order = None
    
    if payload.work_order_number is not None:
        work_order = database.scalar(
            select(WorkOrder).where(
                WorkOrder.account_id == current_user.account_id,
                WorkOrder.work_order_number
                == payload.work_order_number,
            )
        )
        if work_order is None:
            raise HTTPException(
                status_code=404,
                detail="Work order not found",
            )

        if work_order.status != "Approved":
            raise HTTPException(
                status_code=409,
                detail="Work order must be approved",
            )

    supplier = database.scalar(
        select(Supplier).where(
            Supplier.account_id == current_user.account_id,
            Supplier.supplier_id == payload.supplier_id,
        )
    )
    if supplier is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found",
        )

    if supplier.status != "Approved":
        raise HTTPException(
            status_code=409,
            detail="Supplier must be approved",
        )

    # If your Supplier model has an Active/Inactive field, check it here too.
    if hasattr(supplier, "is_active") and not supplier.is_active:
        raise HTTPException(
            status_code=409,
            detail="Supplier is inactive",
        )

    year = datetime.now(timezone.utc).year

    purchase_order = PurchaseOrder(
        account_id=current_user.account_id,
        purchase_order_number=next_po_number(
            database,
            current_user.account_id,
            year,
        ),
        title = payload.title.strip(),
        priority = payload.priority,
        created_year=year,
        created_by_user_id=current_user.database_id,
        supplier_database_id = supplier.database_id,
        work_order_id=(work_order.database_id if work_order is not None else None),
        description=payload.description.strip(),
        amount=payload.amount,
        status="Draft",
    )

    database.add(purchase_order)
    database.flush()

    add_po_audit(
        database,
        current_user,
        purchase_order,
        action="Created purchase order",
        details="Purchase order created as Draft",
    )

    return commit_and_read(database, purchase_order)

@router.get(
    "/{purchase_order_number}",
    response_model=PurchaseOrderRead,
)

def get_purchase_order(
    purchase_order_number: str,
    current_user: User = Depends(
        require_roles(
            "Admin",
            "Staff",
            "Manager",
            "President",
            "Board Member",
            "Treasurer",
        )
    ),
    database: Session = Depends(get_db),
):
    purchase_order = get_purchase_order_or_404(
        database,
        current_user.account_id,
        purchase_order_number,
    )
    work_order, supplier = get_related_records(
        database,
        purchase_order,
    )

    return to_purchase_order_read(
        purchase_order,
        work_order,
        supplier,
    )

@router.post(
    "/{purchase_order_number}/submit",
    response_model=PurchaseOrderRead,
)

def submit_purchase_order(
    purchase_order_number: str,
    current_user: User = Depends(
        require_roles("Admin", "Manager", "Staff")
    ),
    database: Session = Depends(get_db),
):
    purchase_order = get_purchase_order_or_404(
        database,
        current_user.account_id,
        purchase_order_number,
    )

    if purchase_order.status != "Draft":
        raise HTTPException(
            status_code=409,
            detail="Only a Draft purchase order can be submitted",
        )

    work_order, supplier = get_related_records(
        database,
        purchase_order,
    )

    
    if work_order is not None and work_order.status != "Approved":
        raise HTTPException(
        status_code= 409,
        detail="Work order is no longer approved"
    )

    if supplier.status != "Approved":
        raise HTTPException(
            status_code=409,
            detail="Supplier is no longer approved",
        )

    if hasattr(supplier, "is_active") and not supplier.is_active:
        raise HTTPException(
            status_code=409,
            detail="Supplier is inactive",
        )

    purchase_order.status = "Pending President Approval"

    add_po_audit(
        database,
        current_user,
        purchase_order,
        action="Submitted purchase order",
        details=(
            "Purchase order submitted; pending President approval. "
            f"Amount: {purchase_order.amount} MXN"
        ),
    )

    return commit_and_read(database, purchase_order)

def approve_purchase_order_step(
    database: Session,
    current_user: User,
    purchase_order_number: str,
    expected_status: str,
    next_status: str,
    role: str,
) -> PurchaseOrderRead:
    purchase_order = get_purchase_order_or_404(
        database,
        current_user.account_id,
        purchase_order_number,
    )
    ensure_not_creator(purchase_order, current_user)

    if purchase_order.status != expected_status:
        raise HTTPException(
            status_code=409,
            detail=f"Purchase order is not pending {role} approval",
        )

    purchase_order.status = next_status

    add_po_audit(
        database,
        current_user,
        purchase_order,
        action=f"Approved purchase order by {role}",
        details=f"{role} approved; new status: {next_status}",
    )

    return commit_and_read(database, purchase_order)

@router.post(
    "/{purchase_order_number}/approve-treasurer",
    response_model=PurchaseOrderRead,
)

def approve_purchase_order_treasurer(
    purchase_order_number: str,
    current_user: User = Depends(
        require_roles("Treasurer")
    ),
    database: Session = Depends(get_db),
):
    purchase_order = get_purchase_order_or_404(
        database,
        current_user.account_id,
        purchase_order_number,
    )

    next_status = (
        "Pending Board Member Approval"
        if (
            purchase_order.amount >= BOARD_THRESHOLD
            or purchase_order.priority == "High"
        )
        else "Approved"
    )

    return approve_purchase_order_step(
        database,
        current_user,
        purchase_order_number,
        expected_status="Pending Treasurer Approval",
        next_status=next_status,
        role="Treasurer",
    )

@router.post(
    "/{purchase_order_number}/approve-president",
    response_model=PurchaseOrderRead,
)

def approve_purchase_order_president(
    purchase_order_number: str,
    current_user: User = Depends(
        require_roles("President")
    ),
    database: Session = Depends(get_db),
):
    return approve_purchase_order_step(
        database,
        current_user,
        purchase_order_number,
        expected_status="Pending President Approval",
        next_status="Pending Treasurer Approval",
        role="President",
    )

@router.post(
    "/{purchase_order_number}/approve-board-member",
    response_model=PurchaseOrderRead,
)

def approve_purchase_order_board_member(
    purchase_order_number: str,
    current_user: User = Depends(
        require_roles("Board Member")
    ),
    database: Session = Depends(get_db),
):
    return approve_purchase_order_step(
        database,
        current_user,
        purchase_order_number,
        expected_status="Pending Board Member Approval",
        next_status="Approved",
        role="Board Member",
    )

@router.post(
    "/{purchase_order_number}/reject",
    response_model=PurchaseOrderRead,
)

def reject_purchase_order(
    purchase_order_number: str,
    payload: PurchaseOrderReject,
    current_user: User = Depends(
        require_roles("President", "Manager", "Board Member")
    ),
    database: Session = Depends(get_db),
):
    purchase_order = get_purchase_order_or_404(
        database,
        current_user.account_id,
        purchase_order_number,
    )
    ensure_not_creator(purchase_order, current_user)

    required_role = {
        "Pending President Approval": "President",
        "Pending Treasurer Approval": "Treasurer",
        "Pending Board Member Approval": "Board Member",
    }.get(purchase_order.status)

    if required_role is None:
        raise HTTPException(
            status_code=409,
            detail="Purchase order is not pending approval",
        )

    if current_user.user_role != required_role:
        raise HTTPException(
            status_code=403,
            detail=f"Only the {required_role} can reject at this step",
        )

    purchase_order.status = f"Rejected by {required_role}"

    add_po_audit(
        database,
        current_user,
        purchase_order,
        action=f"Rejected purchase order by {required_role}",
        details=payload.comment.strip(),
    )

    return commit_and_read(database, purchase_order)