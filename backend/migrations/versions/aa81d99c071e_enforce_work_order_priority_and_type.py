"""enforce work order priority and type

Revision ID: aa81d99c071e
Revises: 5fd9b125a318
Create Date: 2026-09-21 17:20:38.265040

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa81d99c071e'
down_revision: Union[str, Sequence[str], None] = '5fd9b125a318'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table("work_orders", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_work_orders_priority_valid",
            "priority IN ('Low', 'Medium', 'High')",
        )
        batch_op.create_check_constraint(
            "ck_work_orders_type_valid",
            "type IN ('Normal', 'Emergency')",
        )


def downgrade() -> None:
    with op.batch_alter_table("work_orders", schema=None) as batch_op:
        batch_op.drop_constraint(
            "ck_work_orders_type_valid",
            type_="check",
        )
        batch_op.drop_constraint(
            "ck_work_orders_priority_valid",
            type_="check",
        )