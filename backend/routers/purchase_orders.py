from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from database import get_db
from models import AuditLog, PurchaseOrder, PurchaseOrderSequence, Supplier, User, WorkOrder

from schemas.purchase_orders import (
    PurchaseOrderCreate,
    PurchaseOrderRead,
    PurchaseOrderReject,
 )
from users import require_roles
from services.notifications.events import NotificationEvent
from services.notifications.notification_service import create_notifications


router = APIRouter(
    prefix="/api/purchase-orders",
    tags=["Purchase Orders"],
 )

BOARD_THRESHOLD = Decimal("10000.00")

### Response and Numbering Helpers ###

def get_related_records(
    database: Session,
    purchase_order: PurchaseOrder,
 ) -> tuple[WorkOrder | None, Supplier]:
    work_order = None

    if purchase_order.work_order_id is not None:
        work_order = database.scalar(
            select(WorkOrder).where(
                WorkOrder.database_id == purchase_order.work_order_id,
                WorkOrder.account_id == purchase_order.account_id,
            )
        )

        if work_order is None:
            raise HTTPException(
                status_code=409,
                detail="Purchase order has an invalid related work order",
            )

    supplier = database.scalar(
        select(Supplier).where(
            Supplier.database_id == purchase_order.supplier_database_id,
            Supplier.account_id == purchase_order.account_id,
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
        created_year=purchase_order.created_year,
        work_order_number=(
            work_order.work_order_number if work_order is not None else None
        ),
        supplier_id=supplier.supplier_id,
        description=purchase_order.description,
        amount=purchase_order.amount,
        status=purchase_order.status,
        created_at=purchase_order.created_at,
        created_by_user_id=purchase_order.created_by_user_id,
    )

def next_po_number(
    database: Session,
    account_id: str,
    year: int,
 ) -> str:
    # Preserve atomic numbering within each account and year.
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
                "last_number": PurchaseOrderSequence.last_number + 1,
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

### Read Purchase Order ###

@router.get(
    "/{purchase_order_number}",
    response_model=PurchaseOrderRead,
 )

def get_purchase_order(
    purchase_order_number: str,
    current_user: User = Depends(
        require_roles(
            "Admin", "Staff", "Manager",
            "President", "Board Member", "Treasurer",
        )
    ),
    database: Session = Depends(get_db),
 ):
    purchase_order = database.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.purchase_order_number == purchase_order_number,
            PurchaseOrder.account_id == current_user.account_id,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    work_order, supplier = get_related_records(database, purchase_order)

    return to_purchase_order_read(purchase_order, work_order, supplier)

### Create Purchase Order ###

@router.post(
    "",
    response_model=PurchaseOrderRead,
    status_code=201,
 )

def create_purchase_order(
    payload: PurchaseOrderCreate,
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
    database: Session = Depends(get_db),
 ):
    work_order = None

    if payload.work_order_number is not None:
        work_order = database.scalar(
            select(WorkOrder).where(
                WorkOrder.work_order_number == payload.work_order_number,
                WorkOrder.account_id == current_user.account_id,
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
            Supplier.supplier_id == payload.supplier_id,
            Supplier.account_id == current_user.account_id,
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

    if hasattr(supplier, "is_active") and not supplier.is_active:
        raise HTTPException(
            status_code=409,
            detail="Supplier is inactive",
        )

    year = datetime.now(timezone.utc).year

    purchase_order = PurchaseOrder(
        account_id=current_user.account_id,
        purchase_order_number=next_po_number(
            database, current_user.account_id, year
        ),
        title=payload.title.strip(),
        priority=payload.priority,
        created_year=year,
        created_by_user_id=current_user.database_id,
        supplier_database_id=supplier.database_id,
        work_order_id=(
            work_order.database_id if work_order is not None else None
        ),
        description=payload.description.strip(),
        amount=payload.amount,
        status="Draft",
    )

    database.add(purchase_order)
    database.flush()

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=current_user.user_name,
        user_role=current_user.user_role,
        action="Created purchase order",
        table_name="purchase_orders",
        record_id=purchase_order.purchase_order_number,
        details="Purchase order created as Draft",
        work_order_id=purchase_order.work_order_id,
    )

    database.add(audit_record)
    database.commit()
    database.refresh(purchase_order)

    return to_purchase_order_read(purchase_order, work_order, supplier)

### Submit Purchase Order ###

@router.post(
    "/{purchase_order_number}/submit",
    response_model=PurchaseOrderRead,
 )

def submit_purchase_order(
    purchase_order_number: str,
    current_user: User = Depends(require_roles("Admin", "Manager", "Staff")),
    database: Session = Depends(get_db),
    ):
    purchase_order = database.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.purchase_order_number == purchase_order_number,
            PurchaseOrder.account_id == current_user.account_id,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    if purchase_order.status != "Draft":
        raise HTTPException(
            status_code=409,
            detail="Only a Draft purchase order can be submitted",
        )

    work_order, supplier = get_related_records(database, purchase_order)

    if work_order is not None and work_order.status != "Approved":
        raise HTTPException(
            status_code=409,
            detail="Work order is no longer approved",
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

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=current_user.user_name,
        user_role=current_user.user_role,
        action="Submitted purchase order",
        table_name="purchase_orders",
        record_id=purchase_order.purchase_order_number,
        details=(
            "Purchase order submitted; pending President approval. "
            f"Amount: {purchase_order.amount} MXN"
        ),
        work_order_id=purchase_order.work_order_id,
    )

    database.add(audit_record)

    create_notifications(
        database=database,
        account_id=purchase_order.account_id,
        event=NotificationEvent.PO_APPROVAL_REQUESTED,
        event_key=f"po-submit-{purchase_order.database_id}-{uuid4().hex}",
        entity_type="purchase_order",
        entity_id=purchase_order.database_id,
        reference=purchase_order.purchase_order_number,
        recipient_roles=["President"],
        exclude_user_id=purchase_order.created_by_user_id,
        send_email=True,
    )

    create_notifications(
        database=database,
        account_id=purchase_order.account_id,
        event=NotificationEvent.PO_SUBMISSION_NOTIFICATION,
        event_key=f"po-submit-{purchase_order.database_id}-{uuid4().hex}",
        entity_type="purchase_order",
        entity_id=purchase_order.database_id,
        reference=purchase_order.purchase_order_number,
        recipient_roles=["Staff", "Manager"],
        exclude_user_id=purchase_order.created_by_user_id,
        send_email=True,
    )

    database.commit()
    database.refresh(purchase_order)

    return to_purchase_order_read(purchase_order, work_order, supplier)

### Approve Purchase Order ###

@router.post(
    "/{purchase_order_number}/approve-president",
    response_model=PurchaseOrderRead,
 )

def approve_purchase_order_president(
    purchase_order_number: str,
    current_user: User = Depends(require_roles("President")),
    database: Session = Depends(get_db),
 ):
    purchase_order = database.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.purchase_order_number == purchase_order_number,
            PurchaseOrder.account_id == current_user.account_id,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    if purchase_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Creator cannot approve or reject their own purchase order",
        )

    if purchase_order.status != "Pending President Approval":
        raise HTTPException(
            status_code=409,
            detail="Purchase order is not pending President approval",
        )

    work_order, supplier = get_related_records(database, purchase_order)

    purchase_order.status = "Pending Treasurer Approval"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=current_user.user_name,
        user_role=current_user.user_role,
        action="Approved purchase order by President",
        table_name="purchase_orders",
        record_id=purchase_order.purchase_order_number,
        details="President approved; new status: Pending Treasurer Approval",
        work_order_id=purchase_order.work_order_id,
    )

    database.add(audit_record)

    create_notifications(
        database=database,
        account_id=purchase_order.account_id,
        event=NotificationEvent.PO_APPROVAL_REQUESTED,
        event_key=(
            f"po-president-approved-{purchase_order.database_id}-{uuid4().hex}"
        ),
        entity_type="purchase_order",
        entity_id=purchase_order.database_id,
        reference=purchase_order.purchase_order_number,
        recipient_roles=["Treasurer"],
        exclude_user_id=purchase_order.created_by_user_id,
        send_email=True,
    )
    
    create_notifications(
        database=database,
        account_id=purchase_order.account_id,
        event=NotificationEvent.PO_APPROVAL_NOTIFICATION,
        event_key=(
            f"po-treasurer-approved-{purchase_order.database_id}-{uuid4().hex}"
        ),
        entity_type="purchase_order",
        entity_id=purchase_order.database_id,
        reference=purchase_order.purchase_order_number,
        recipient_roles=["Staff", "Manager"],
        exclude_user_id=purchase_order.created_by_user_id,
        send_email=True,
    )

    database.commit()
    database.refresh(purchase_order)

    return to_purchase_order_read(purchase_order, work_order, supplier)

@router.post(
    "/{purchase_order_number}/approve-treasurer",
    response_model=PurchaseOrderRead,
 )

def approve_purchase_order_treasurer(
    purchase_order_number: str,
    current_user: User = Depends(require_roles("Treasurer")),
    database: Session = Depends(get_db),
 ):
    purchase_order = database.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.purchase_order_number == purchase_order_number,
            PurchaseOrder.account_id == current_user.account_id,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    if purchase_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Creator cannot approve or reject their own purchase order",
        )

    if purchase_order.status != "Pending Treasurer Approval":
        raise HTTPException(
            status_code=409,
            detail="Purchase order is not pending Treasurer approval",
        )

    work_order, supplier = get_related_records(database, purchase_order)

    needs_board_approval = (
        purchase_order.amount >= BOARD_THRESHOLD
        or purchase_order.priority == "High"
    )

    if needs_board_approval:
        purchase_order.status = "Pending Board Member Approval"
    else:
        purchase_order.status = "Approved"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=current_user.user_name,
        user_role=current_user.user_role,
        action="Approved purchase order by Treasurer",
        table_name="purchase_orders",
        record_id=purchase_order.purchase_order_number,
        details=f"Treasurer approved; new status: {purchase_order.status}",
        work_order_id=purchase_order.work_order_id,
    )

    database.add(audit_record)

    if needs_board_approval:
        create_notifications(
            database=database,
            account_id=purchase_order.account_id,
            event=NotificationEvent.PO_APPROVAL_REQUESTED,
            event_key=(
                f"po-treasurer-approved-{purchase_order.database_id}-{uuid4().hex}"
            ),
            entity_type="purchase_order",
            entity_id=purchase_order.database_id,
            reference=purchase_order.purchase_order_number,
            recipient_roles=["Board Member"],
            exclude_user_id=purchase_order.created_by_user_id,
            send_email=True,
        )


        create_notifications(
            database=database,
            account_id=purchase_order.account_id,
            event=NotificationEvent.PO_APPROVAL_NOTIFICATION,
            event_key=(
                f"po-treasurer-approved-{purchase_order.database_id}-{uuid4().hex}"
            ),
            entity_type="purchase_order",
            entity_id=purchase_order.database_id,
            reference=purchase_order.purchase_order_number,
            recipient_roles=["Staff", "Manager","President"],
            exclude_user_id=purchase_order.created_by_user_id,
            send_email=True,
        )
    else:
        create_notifications(
            database=database,
            account_id=purchase_order.account_id,
            event=NotificationEvent.PO_APPROVED,
            event_key=(
                f"po-treasurer-approved-{purchase_order.database_id}-{uuid4().hex}"
            ),
            entity_type="purchase_order",
            entity_id=purchase_order.database_id,
            reference=purchase_order.purchase_order_number,
            recipient_roles=["Staff", "Manager","President"],
            send_email=True,
        )

    database.commit()
    database.refresh(purchase_order)

    return to_purchase_order_read(purchase_order, work_order, supplier)

@router.post(
    "/{purchase_order_number}/approve-board-member",
    response_model=PurchaseOrderRead,
    )

def approve_purchase_order_board_member(
    purchase_order_number: str,
    current_user: User = Depends(require_roles("Board Member")),
    database: Session = Depends(get_db),
 ):
    purchase_order = database.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.purchase_order_number == purchase_order_number,
            PurchaseOrder.account_id == current_user.account_id,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    if purchase_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Creator cannot approve or reject their own purchase order",
        )

    if purchase_order.status != "Pending Board Member Approval":
        raise HTTPException(
            status_code=409,
            detail="Purchase order is not pending Board Member approval",
        )

    work_order, supplier = get_related_records(database, purchase_order)

    purchase_order.status = "Approved"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=current_user.user_name,
        user_role=current_user.user_role,
        action="Approved purchase order by Board Member",
        table_name="purchase_orders",
        record_id=purchase_order.purchase_order_number,
        details="Board Member approved; new status: Approved",
        work_order_id=purchase_order.work_order_id,
    )

    database.add(audit_record)

    create_notifications(
        database=database,
        account_id=purchase_order.account_id,
        event=NotificationEvent.PO_APPROVED,
        event_key=(
            f"po-board-member-approved-{purchase_order.database_id}-{uuid4().hex}"
        ),
        entity_type="purchase_order",
        entity_id=purchase_order.database_id,
        reference=purchase_order.purchase_order_number,
        recipient_roles=["Staff", "Manager","President", "Treasurer", "Board Member"],
        exclude_user_id=current_user.database_id,
        send_email=True,
    )

    database.commit()
    database.refresh(purchase_order)

    return to_purchase_order_read(purchase_order, work_order, supplier)


### Reject Purchase Order ###

@router.post(
    "/{purchase_order_number}/reject",
    response_model=PurchaseOrderRead,
 )

def reject_purchase_order(
    purchase_order_number: str,
    payload: PurchaseOrderReject,
    current_user: User = Depends(
        require_roles("President", "Treasurer", "Board Member")
    ),
    database: Session = Depends(get_db),
 ):
    purchase_order = database.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.purchase_order_number == purchase_order_number,
            PurchaseOrder.account_id == current_user.account_id,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    if purchase_order.created_by_user_id == current_user.database_id:
        raise HTTPException(
            status_code=403,
            detail="Creator cannot approve or reject their own purchase order",
        )

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

    work_order, supplier = get_related_records(database, purchase_order)

    purchase_order.status = f"Rejected by {required_role}"

    audit_record = AuditLog(
        account_id=current_user.account_id,
        user_id=current_user.auth_user_id,
        user_name=current_user.user_name,
        user_role=current_user.user_role,
        action=f"Rejected purchase order by {required_role}",
        table_name="purchase_orders",
        record_id=purchase_order.purchase_order_number,
        details=payload.comment.strip(),
        work_order_id=purchase_order.work_order_id,
    )

    database.add(audit_record)

    create_notifications(
        database=database,
        account_id=purchase_order.account_id,
        event=NotificationEvent.PO_REJECTED,
        event_key=(
            f"po-{required_role.lower().replace(' ', '-')}-rejected-"
            f"{purchase_order.database_id}-{uuid4().hex}"
        ),
        entity_type="purchase_order",
        entity_id=purchase_order.database_id,
        reference=purchase_order.purchase_order_number,
        recipient_roles=["Staff", "Manager","President", "Treasurer", "Board Member"],
        exclude_user_id=current_user.database_id,
        send_email=True,
    )

    database.commit()
    database.refresh(purchase_order)

    return to_purchase_order_read(purchase_order, work_order, supplier)

