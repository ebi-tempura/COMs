"""require work order creator

Revision ID: e352a2eaaf79
Revises: 7ab7b9dbab54
Create Date: 2026-09-21 17:11:18.856926

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e352a2eaaf79'
down_revision: Union[str, Sequence[str], None] = '7ab7b9dbab54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("work_orders", schema=None) as batch_op:
        batch_op.alter_column(
            "created_by_user_id",
            existing_type=sa.INTEGER(),
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("work_orders", schema=None) as batch_op:
        batch_op.alter_column(
            "created_by_user_id",
            existing_type=sa.INTEGER(),
            nullable=True,
        )