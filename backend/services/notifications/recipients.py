
from sqlalchemy.orm import Session

from models import User


def get_notification_recipients(
    database: Session,
    account_id: str,
    roles: list[str],
    exclude_user_id: int | None = None,
) -> list[User]:
    """
    Return active users belonging to the specified building account
    whose roles match the requested roles.

    exclude_user_id refers to User.database_id.
    """

    if not account_id or not roles:
        return []

    query = database.query(User).filter(
        User.account_id == account_id,
        User.user_role.in_(roles),
        User.status == "Active",
    )

    if exclude_user_id is not None:
        query = query.filter(
            User.database_id != exclude_user_id
        )

    return query.order_by(User.database_id).all()
