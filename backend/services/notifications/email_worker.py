
import logging
import time

from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from database import SessionLocal
from models_.notifications import Notification, NotificationDelivery
from models import User

from services.notifications.email_sender import (
    EmailSendError,
    send_notification_email,
)


logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
RETRY_BASE_SECONDS = 60


def utc_now():
    return datetime.now(timezone.utc)


def normalize_datetime(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def process_one_delivery(database: Session) -> bool:
    now = utc_now()

    # Claim the delivery before making an external request.
    # This assumes a single worker process.
    delivery = database.scalar(
        select(NotificationDelivery)
        .where(
            NotificationDelivery.channel == "email",
            NotificationDelivery.status == "Pending",
            NotificationDelivery.attempt_count < MAX_ATTEMPTS,
            or_(
                NotificationDelivery.next_attempt_at.is_(None),
                NotificationDelivery.next_attempt_at <= now,
            ),
        )
        .order_by(NotificationDelivery.database_id)
        .limit(1)
    )

    if delivery is None:
        return False

    delivery.status = "Processing"
    delivery.attempt_count += 1
    database.commit()

    notification = database.get(
        Notification, delivery.notification_id
    )

    if notification is None:
        delivery.status = "Failed"
        delivery.last_error = "Notification no longer exists"
        database.commit()
        return True

    recipient = database.scalar(
        select(User).where(
            User.database_id == notification.recipient_user_id,
            User.account_id == notification.account_id,
        )
    )

    if (
        recipient is None
        or recipient.status != "Active"
        or not recipient.email
        or recipient.email.lower() != delivery.recipient_address.lower()
    ):
        delivery.status = "Failed"
        delivery.last_error = "Recipient is no longer eligible"
        database.commit()
        return True

    try:
        send_notification_email(
            recipient=delivery.recipient_address,
            subject=notification.title,
            message=notification.message,
            idempotency_key=f"coms-delivery-{delivery.database_id}",
        )

    except EmailSendError as exc:
        delivery.last_error = str(exc)[:1000]

        if exc.retryable and delivery.attempt_count < MAX_ATTEMPTS:
            delay = RETRY_BASE_SECONDS * (
                2 ** (delivery.attempt_count - 1)
            )
            delivery.status = "Pending"
            delivery.next_attempt_at = utc_now() + timedelta(
                seconds=delay
            )
        else:
            delivery.status = "Failed"
            delivery.next_attempt_at = None

        database.commit()
        logger.warning(
            "Email delivery %s failed: %s",
            delivery.database_id,
            exc,
        )
        return True

    delivery.status = "Sent"
    delivery.sent_at = utc_now()
    delivery.next_attempt_at = None
    delivery.last_error = None
    database.commit()

    logger.info("Email delivery %s sent", delivery.database_id)
    return True


def run_worker():
    logging.basicConfig(level=logging.INFO)

    logger.info("COMs email worker started")

    while True:
        try:
            with SessionLocal() as database:
                processed = process_one_delivery(database)

            if not processed:
                time.sleep(10)

        except Exception:
            logger.exception("Unexpected email worker error")
            time.sleep(10)


if __name__ == "__main__":
    run_worker()
