
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import User
from models_.notifications import Notification
from users import get_current_user


router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


def notification_to_dict(record: Notification):
    return {
        "database_id": record.database_id,
        "event": record.event_type,
        "title": record.title,
        "message": record.message,
        "entity_type": record.entity_type,
        "entity_id": record.entity_id,
        "is_read": record.read_at is not None,
        "read_at": record.read_at,
        "created_at": record.created_at,
    }


# 1. List notifications
@router.get("")
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    statement = select(Notification).where(
        Notification.account_id == current_user.account_id,
        Notification.recipient_user_id == current_user.database_id,
    )

    if unread_only:
        statement = statement.where(
            Notification.is_read.is_(False)
        )

    statement = (
        statement
        .order_by(
            Notification.created_at.desc(),
            Notification.database_id.desc(),
        )
        .limit(limit)
        .offset(offset)
    )

    records = database.scalars(statement).all()

    return [notification_to_dict(record) for record in records]


# 2. Unread notification count
@router.get("/unread-count")
def unread_notification_count(
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    count = database.scalar(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.account_id == current_user.account_id,
            Notification.recipient_user_id == current_user.database_id,
            Notification.is_read.is_(False),
        )
    )

    return {"unread_count": count or 0}


# 3. Mark notification as read
@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    notification = database.scalar(
        select(Notification).where(
            Notification.database_id == notification_id,
            Notification.account_id == current_user.account_id,
            Notification.recipient_user_id == current_user.database_id,
        )
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    if not notification.is_read:
        notification.is_read = True
        database.commit()
        database.refresh(notification)

    return notification_to_dict(notification)
