
from uuid import uuid4

from sqlalchemy import func

from database import SessionLocal
from models import User
from models_
from uuid import uuid4

from sqlalchemy import func

from database import SessionLocal
from models import User
from db_models.notifications import (
    Notification,
    NotificationDelivery,
)
from services.notifications.events import NotificationEvent
from services.notifications.notification_service import (
    create_notifications,
)


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"PASS: {message}")


def run_test():
    database = SessionLocal()

    try:
        users = (
            database.query(User)
            .filter(User.status == "Active")
            .order_by(User.database_id)
            .all()
        )

        check(
            len(users) > 0,
            "Active test users are available",
        )

        user = users[0]
        account_id = user.account_id
        role = user.user_role

        # Unique key avoids interference with other tests.
        event_key = f"security-test-{uuid4().hex}"

        kwargs = dict(
            database=database,
            account_id=account_id,
            event=NotificationEvent.WO_APPROVAL_REQUESTED,
            event_key=event_key,
            entity_type="work_order",
            entity_id=1,
            reference="WO-TEST-SECURITY",
            recipient_roles=[role],
            send_email=True,
        )

        # TEST 1: Tenant isolation
        created = create_notifications(**kwargs)
        database.flush()

        check(
            len(created) > 0,
            "Notifications created for eligible users",
        )

        for notification in created:
            recipient = database.get(
                User, notification.recipient_user_id
            )

            check(
                notification.account_id == account_id
                and recipient.account_id == account_id,
                "Recipient belongs to correct building",
            )

        # TEST 2: Inactive users
        inactive_ids = {
            u.database_id
            for u in database.query(User).filter(
                User.account_id == account_id,
                User.user_role == role,
                User.status != "Active",
            ).all()
        }

        check(
            all(
                n.recipient_user_id not in inactive_ids
                for n in created
            ),
            "Inactive users excluded",
        )

        # TEST 3: Creator exclusion
        second_key = f"exclude-test-{uuid4().hex}"

        excluded = create_notifications(
            **{
                **kwargs,
                "event_key": second_key,
                "exclude_user_id": user.database_id,
            }
        )

        check(
            all(
                n.recipient_user_id != user.database_id
                for n in excluded
            ),
            "Creator excluded from approval notifications",
        )

        # TEST 4: Email queue
        notification_ids = [
            n.database_id for n in created
        ]

        deliveries = (
            database.query(NotificationDelivery)
            .filter(
                NotificationDelivery.notification_id.in_(
                    notification_ids
                )
            )
            .all()
        )

        expected_deliveries = sum(
            bool(
                database.get(User, n.recipient_user_id).email
            )
            for n in created
        )

        check(
            len(deliveries) == expected_deliveries,
            "Email deliveries queued for recipients with email",
        )

        # TEST 5: Transaction rollback
        created_ids = [
            n.database_id for n in created + excluded
        ]

        database.flush()
        database.rollback()

        remaining = (
            database.query(Notification)
            .filter(
                Notification.database_id.in_(created_ids)
            )
            .count()
        )

        check(
            remaining == 0,
            "Notification records rolled back",
        )

        remaining_deliveries = (
            database.query(NotificationDelivery)
            .filter(
                NotificationDelivery.notification_id.in_(
                    created_ids
                )
            )
            .count()
        )

        check(
            remaining_deliveries == 0,
            "Email delivery records rolled back",
        )

        print("\nAll notification security tests passed.")

    finally:
        database.rollback()
        database.close()


if __name__ == "__main__":
    run_test()
.notifications import (
    Notification,
    NotificationDelivery,
)
from services.notifications.events import NotificationEvent
from services.notifications.notification_service import (
    create_notifications,
)


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"PASS: {message}")


def run_test():
    database = SessionLocal()

    try:
        users = (
            database.query(User)
            .filter(User.status == "Active")
            .order_by(User.database_id)
            .all()
        )

        check(
            len(users) > 0,
            "Active test users are available",
        )

        user = users[0]
        account_id = user.account_id
        role = user.user_role

        # Unique key avoids interference with other tests.
        event_key = f"security-test-{uuid4().hex}"

        kwargs = dict(
            database=database,
            account_id=account_id,
            event=NotificationEvent.WO_APPROVAL_REQUESTED,
            event_key=event_key,
            entity_type="work_order",
            entity_id=1,
            reference="WO-TEST-SECURITY",
            recipient_roles=[role],
            send_email=True,
        )

        # TEST 1: Tenant isolation
        created = create_notifications(**kwargs)
        database.flush()

        check(
            len(created) > 0,
            "Notifications created for eligible users",
        )

        for notification in created:
            recipient = database.get(
                User, notification.recipient_user_id
            )

            check(
                notification.account_id == account_id
                and recipient.account_id == account_id,
                "Recipient belongs to correct building",
            )

        # TEST 2: Inactive users
        inactive_ids = {
            u.database_id
            for u in database.query(User).filter(
                User.account_id == account_id,
                User.user_role == role,
                User.status != "Active",
            ).all()
        }

        check(
            all(
                n.recipient_user_id not in inactive_ids
                for n in created
            ),
            "Inactive users excluded",
        )

        # TEST 3: Creator exclusion
        second_key = f"exclude-test-{uuid4().hex}"

        excluded = create_notifications(
            **{
                **kwargs,
                "event_key": second_key,
                "exclude_user_id": user.database_id,
            }
        )

        check(
            all(
                n.recipient_user_id != user.database_id
                for n in excluded
            ),
            "Creator excluded from approval notifications",
        )

        # TEST 4: Email queue
        notification_ids = [
            n.database_id for n in created
        ]

        deliveries = (
            database.query(NotificationDelivery)
            .filter(
                NotificationDelivery.notification_id.in_(
                    notification_ids
                )
            )
            .all()
        )

        expected_deliveries = sum(
            bool(
                database.get(User, n.recipient_user_id).email
            )
            for n in created
        )

        check(
            len(deliveries) == expected_deliveries,
            "Email deliveries queued for recipients with email",
        )

        # TEST 5: Transaction rollback
        created_ids = [
            n.database_id for n in created + excluded
        ]

        database.flush()
        database.rollback()

        remaining = (
            database.query(Notification)
            .filter(
                Notification.database_id.in_(created_ids)
            )
            .count()
        )

        check(
            remaining == 0,
            "Notification records rolled back",
        )

        remaining_deliveries = (
            database.query(NotificationDelivery)
            .filter(
                NotificationDelivery.notification_id.in_(
                    created_ids
                )
            )
            .count()
        )

        check(
            remaining_deliveries == 0,
            "Email delivery records rolled back",
        )

        print("\nAll notification security tests passed.")

    finally:
        database.rollback()
        database.close()


if __name__ == "__main__":
    run_test()
