
from sqlalchemy.orm import Session

from models_.notifications import (
    Notification,
    NotificationDelivery,
)
from services.notifications.events import (
    NotificationEvent,
    build_notification_message,
)
from services.notifications.recipients import (
    get_notification_recipients,
)

def create_notifications(
    database: Session,
    *,
    account_id: str,
    event: NotificationEvent,
    event_key: str,
    entity_type: str,
    entity_id: int,
    reference: str,
    recipient_roles: list[str],
    exclude_user_id: int | None = None,
    send_email: bool = True,
    user_role: str | None = None,
) -> list[Notification]:
    """
    Create in-app notifications and queue email deliveries.

    Does not commit the transaction.
    The calling workflow is responsible for database.commit().

    event_key must uniquely identify a workflow event occurrence.
    """

    if not account_id or not event_key or not entity_type:
        raise ValueError(
            "account_id, event_key, and entity_type are required"
        )

    if entity_id <= 0:
        raise ValueError("entity_id must be a positive integer")

    recipients = get_notification_recipients(
        database=database,
        account_id=account_id,
        roles=recipient_roles,
        exclude_user_id=exclude_user_id,
    )

    title, message = build_notification_message(
        event=event,
        reference=reference,
        user_role=user_role,
    )

    created_notifications = []

    for recipient in recipients:
        existing = (
            database.query(Notification)
            .filter(
                Notification.account_id == account_id,
                Notification.event_key == event_key,
                Notification.recipient_user_id
                == recipient.database_id,
            )
            .first()
        )

        if existing is not None:
            continue

        notification = Notification(
            account_id=account_id,
            recipient_user_id=recipient.database_id,
            event_key=event_key,
            event_type=event.value,
            entity_type=entity_type,
            entity_id=entity_id,
            title=title,
            message=message,
        )

        database.add(notification)
        database.flush()

        if send_email and recipient.email:
            delivery = NotificationDelivery(
                notification_id=notification.database_id,
                channel="email",
                status="Pending",
                recipient_address=recipient.email,
                attempt_count=0,
            )

            database.add(delivery)

        created_notifications.append(notification)

    return created_notifications
