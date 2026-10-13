
from uuid import uuid4

from database import SessionLocal
from models import User
from models_.notifications import Notification, NotificationDelivery
from services.notifications.events import NotificationEvent
from services.notifications.notification_service import create_notifications


database = SessionLocal()

try:
    # Find an active test user.
    user = (
        database.query(User)
        .filter(User.status == "Active", User.email.isnot(None))
        .first()
    )

    if user is None:
        raise RuntimeError("No active user with an email found.")

    event_key = f"manual-test-{uuid4().hex}"

    # Use the selected user's account and role.
    kwargs = dict(
        database=database,
        account_id=user.account_id,
        event=NotificationEvent.WO_APPROVAL_REQUESTED,
        event_key=event_key,
        entity_type="work_order",
        entity_id=1,
        reference="WO-TEST-0001",
        recipient_roles=[user.user_role],
        send_email=True,
    )

    # Create and queue notifications.
    created = create_notifications(**kwargs)
    database.flush()

    print("Notifications created:", len(created))

    for notification in created:
        delivery = (
            database.query(NotificationDelivery)
            .filter(
                NotificationDelivery.notification_id
                == notification.database_id
            )
            .first()
        )

        print(
            "Notification:",
            notification.database_id,
            notification.title,
        )
        print(
            "Email status:",
            delivery.status if delivery else "Not queued",
        )

    # Check duplicate prevention.
    duplicates = create_notifications(**kwargs)
    print("Duplicate notifications created:", len(duplicates))

    # Keep the production database unchanged.
    database.rollback()
    print("Test transaction rolled back successfully.")

finally:
    database.close()
