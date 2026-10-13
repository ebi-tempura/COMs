
from dataclasses import dataclass
from enum import Enum


class NotificationEvent(str, Enum):
    # Work Orders
    WO_APPROVAL_REQUESTED = "wo.approval_requested"
    WO_APPROVED = "wo.approved"
    WO_REJECTED = "wo.rejected"

    # Work Order Completion
    COMPLETION_APPROVAL_REQUESTED = "completion.approval_requested"
    COMPLETION_APPROVED = "completion.approved"
    COMPLETION_REJECTED = "completion.rejected"

    # Purchase Orders
    PO_APPROVAL_REQUESTED = "po.approval_requested"
    PO_APPROVED = "po.approved"
    PO_REJECTED = "po.rejected"

    # Suppliers
    SUPPLIER_APPROVAL_REQUESTED = "supplier.approval_requested"
    SUPPLIER_APPROVED = "supplier.approved"
    SUPPLIER_REJECTED = "supplier.rejected"


@dataclass(frozen=True)
class EventDefinition:
    title: str
    message_template: str


EVENT_DEFINITIONS: dict[NotificationEvent, EventDefinition] = {
    NotificationEvent.WO_APPROVAL_REQUESTED: EventDefinition(
        "Work Order Approval Required",
        "Work Order {reference} requires your approval.",
    ),
    NotificationEvent.WO_APPROVED: EventDefinition(
        "Work Order Approved",
        "Work Order {reference} has been approved.",
    ),
    NotificationEvent.WO_REJECTED: EventDefinition(
        "Work Order Rejected",
        "Work Order {reference} has been rejected.",
    ),

    NotificationEvent.COMPLETION_APPROVAL_REQUESTED: EventDefinition(
        "Completion Approval Required",
        "Completion for Work Order {reference} requires your approval.",
    ),
    NotificationEvent.COMPLETION_APPROVED: EventDefinition(
        "Work Order Completion Approved",
        "Completion for Work Order {reference} has been approved.",
    ),
    NotificationEvent.COMPLETION_REJECTED: EventDefinition(
        "Work Order Completion Rejected",
        "Completion for Work Order {reference} has been rejected.",
    ),

    NotificationEvent.PO_APPROVAL_REQUESTED: EventDefinition(
        "Purchase Order Approval Required",
        "Purchase Order {reference} requires your approval.",
    ),
    NotificationEvent.PO_APPROVED: EventDefinition(
        "Purchase Order Approved",
        "Purchase Order {reference} has been approved.",
    ),
    NotificationEvent.PO_REJECTED: EventDefinition(
        "Purchase Order Rejected",
        "Purchase Order {reference} has been rejected.",
    ),

    NotificationEvent.SUPPLIER_APPROVAL_REQUESTED: EventDefinition(
        "Supplier Approval Required",
        "Supplier {reference} requires your approval.",
    ),
    NotificationEvent.SUPPLIER_APPROVED: EventDefinition(
        "Supplier Approved",
        "Supplier {reference} has been approved.",
    ),
    NotificationEvent.SUPPLIER_REJECTED: EventDefinition(
        "Supplier Rejected",
        "Supplier {reference} has been rejected.",
    ),
}


def build_notification_message(
    event: NotificationEvent,
    reference: str,
) -> tuple[str, str]:
    definition = EVENT_DEFINITIONS[event]

    return (
        definition.title,
        definition.message_template.format(reference=reference),
    )
