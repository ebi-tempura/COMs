from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import PurchaseOrder


def check_split_purchase(
    database: Session,
    purchase_order: PurchaseOrder,
    threshold: Decimal,
) -> str | None:
    if purchase_order.work_order_id is None or purchase_order.amount >= threshold:
        return None

    related_orders = database.scalars(
        select(PurchaseOrder)
        .where(
            PurchaseOrder.account_id == purchase_order.account_id,
            PurchaseOrder.work_order_id == purchase_order.work_order_id,
            PurchaseOrder.supplier_database_id == purchase_order.supplier_database_id,
            PurchaseOrder.database_id != purchase_order.database_id,
            PurchaseOrder.status.in_(
                (
                    "Pending President Approval",
                    "Pending Treasurer Approval",
                    "Pending Board Member Approval",
                    "Approved",
                )
            ),
        )
        .order_by(PurchaseOrder.database_id)
    ).all()

    combined_amount = purchase_order.amount + sum(
        (order.amount for order in related_orders),
        Decimal("0.00"),
    )

    if combined_amount < threshold:
        return None

    related_order_details = ", ".join(
        f"{order.purchase_order_number} (MXN {order.amount:,.2f})"
        for order in related_orders
    )

    return (
        f"Possible split purchase. "
        f"Current PO: {purchase_order.purchase_order_number} "
        f"(MXN {purchase_order.amount:,.2f}). "
        f"Related POs: {related_order_details}. "
        f"Combined amount: MXN {combined_amount:,.2f}."
    )