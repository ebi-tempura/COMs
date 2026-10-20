
from dataclasses import dataclass
from enum import Enum


class NotificationEvent(str, Enum):
    
    # Work Orders
    WO_APPROVAL_REQUESTED = "wo.approval_requested"
    WO_APPROVED = "wo.approved"
    WO_REJECTED = "wo.rejected"
    WO_APPROVAL_NOTIFICATION = "wo.approval_notification"
    WO_REJECT_NOTIFICATION = "wo.reject_notification"
    WO_SUBMISSION_NOTIFICATION = "wo.submission_notification"

    # Work Order Completion
    WO_COMPLETION_APPROVAL_REQUESTED = "completion.approval_requested"
    WO_COMPLETION_APPROVED = "completion.approved"
    WO_COMPLETION_REJECTED = "completion.rejected"
    WO_COMPLETION_APPROVAL_NOTIFICATION = "completion.approval_notification"
    WO_COMPLETION_REJECT_NOTIFICATION = "completion.reject_notification"
    WO_COMPLETION_SUBMISSION_NOTIFICATION = "completion.submission_notification"

    # Work Order emergency
    WO_EMERGENCY_SUBMISSION = "emergency.submission"
    WO_EMERGENCY_APPROVAL_REQUESTED = "emergency.approval_requested"
    WO_EMERGENCY_APPROVED = "emergency.approved"
    WO_EMERGENCY_REJECTED = "emergency.rejected"
    WO_EMERGENCY_APPROVAL_NOTIFICATION = "emergency.approval_notification"
    WO_EMERGENCY_REJECT_NOTIFICATION = "emergency.reject_notification"
    WO_EMERGENCY_SUBMISSION_NOTIFICATION = "emergency.submission_notification"

    # Purchase Orders
    PO_APPROVAL_REQUESTED = "po.approval_requested"
    PO_APPROVED = "po.approved"
    PO_REJECTED = "po.rejected"
    PO_APPROVAL_NOTIFICATION = "po.approval_notification"
    PO_REJECT_NOTIFICATION = "po.reject_notification"

    # Suppliers
    SUPPLIER_APPROVAL_REQUESTED = "supplier.approval_requested"
    SUPPLIER_APPROVED = "supplier.approved"
    SUPPLIER_REJECTED = "supplier.rejected"
    SUPPLIER_APPROVAL_NOTIFICATION = "supplier.approval_notification"
    SUPPLIER_REJECT_NOTIFICATION = "supplier.reject_notification"


@dataclass(frozen=True)
class EventDefinition:
    title: str
    message_template: str


EVENT_DEFINITIONS: dict[NotificationEvent, EventDefinition] = {
    
    # Work Orders    
    
    NotificationEvent.WO_APPROVAL_REQUESTED: EventDefinition(
        "Work Order Authorization Required",
        "Work Order {reference} requires your authorization.",
    ),
    NotificationEvent.WO_APPROVED: EventDefinition(
        "Work Order Authorized",
        "Work Order {reference} has been authorized.",
    ),
    NotificationEvent.WO_APPROVAL_NOTIFICATION: EventDefinition(
        "Work Order Authorization Notification",
        "Work Order {reference} has been authorized by the {user_role}."
    ),
    NotificationEvent.WO_REJECTED: EventDefinition(
        "Work Order Authorization Rejected",
        "Work Order {reference} has been rejected.",
    ),
    NotificationEvent.WO_REJECT_NOTIFICATION: EventDefinition(
        "Work Order Authorization Rejection Notification",
        "Work Order {reference} has been rejected by the {user_role}.",
    ),
    NotificationEvent.WO_SUBMISSION_NOTIFICATION: EventDefinition(
        "Work Order Submission Notification",
        "Work Order {reference} has been submitted for authorization.",
    ),

    # Work Order Completion

    NotificationEvent.WO_COMPLETION_APPROVAL_REQUESTED: EventDefinition(
        "Completion Approval Required",
        "Completion for Work Order {reference} requires your approval.",
    ),
    NotificationEvent.WO_COMPLETION_APPROVED: EventDefinition(
        "Work Order Completion Approved",
        "Completion for Work Order {reference} has been approved.",
    ),
    NotificationEvent.WO_COMPLETION_REJECTED: EventDefinition(
        "Work Order Completion Rejected",
        "Completion for Work Order {reference} has been rejected.",
    ),
    NotificationEvent.WO_COMPLETION_APPROVAL_NOTIFICATION: EventDefinition(
        "Work Order Completion Approval Notification",
        "Completion for Work Order {reference} has been approved by the {user_role}."
    ),
    NotificationEvent.WO_COMPLETION_REJECT_NOTIFICATION: EventDefinition(
        "Work Order Completion Rejection Notification",
        "Completion for Work Order {reference} has been rejected by the {user_role}.",
    ),
    NotificationEvent.WO_COMPLETION_SUBMISSION_NOTIFICATION: EventDefinition(
        "Work Order Completion Submission Notification",
        "Completion for Work Order {reference} has been submitted for approval.",   
    ),

    # Work Order Emergency
    NotificationEvent.WO_EMERGENCY_SUBMISSION: EventDefinition(
        "Emergency Work Order Submission",
        "Emergency Work Order {reference} has been submitted for approval.",
    ),
    NotificationEvent.WO_EMERGENCY_APPROVAL_REQUESTED: EventDefinition(
        "Emergency Work Order Approval Required",
        "Emergency Work Order {reference} requires your approval.",
    ),
    NotificationEvent.WO_EMERGENCY_APPROVED: EventDefinition(
        "Emergency Work Order Approved",
        "Emergency Work Order {reference} has been approved.",
    ),
    NotificationEvent.WO_EMERGENCY_REJECTED: EventDefinition(
        "Emergency Work Order Rejected",
        "Emergency Work Order {reference} has been rejected.",
    ),
    NotificationEvent.WO_EMERGENCY_APPROVAL_NOTIFICATION: EventDefinition(
        "Emergency Work Order Approval Notification",
        "Emergency Work Order {reference} has been approved by the {user_role}."
    ),
    NotificationEvent.WO_EMERGENCY_REJECT_NOTIFICATION: EventDefinition(
        "Emergency Work Order Rejection Notification",
        "Emergency Work Order {reference} has been rejected by the {user_role}.",
    ),
    NotificationEvent.WO_EMERGENCY_SUBMISSION_NOTIFICATION: EventDefinition(
        "Emergency Work Order Submission Notification",
        "Emergency Work Order {reference} has been submitted for approval.",
    ),  

    # Purchase Orders

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
    NotificationEvent.PO_APPROVAL_NOTIFICATION: EventDefinition(
        "Purchase Order Approval Notification",
        "Purchase Order {reference} has been approved by the {user_role}."
    ),
    NotificationEvent.PO_REJECT_NOTIFICATION: EventDefinition(
        "Purchase Order Rejection Notification",
        "Purchase Order {reference} has been rejected by the {user_role}.",
    ),

    # Suppliers
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
    NotificationEvent.SUPPLIER_APPROVAL_NOTIFICATION: EventDefinition(
        "Supplier Approval Notification",
        "Supplier {reference} has been approved by the {user_role}."
    ),
    NotificationEvent.SUPPLIER_REJECT_NOTIFICATION: EventDefinition(
        "Supplier Rejection Notification",
        "Supplier {reference} has been rejected by the {user_role}.",
    ),
}


def build_notification_message(
    event: NotificationEvent,
    reference: str,
    user_role: str
) -> tuple[str, str]:
    definition = EVENT_DEFINITIONS[event]

    return (
        definition.title,
        definition.message_template.format(reference=reference, user_role=user_role),
    )
