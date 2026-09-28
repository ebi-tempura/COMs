"""enforce positive work order amount

Revision ID: 5fd9b125a318
Revises: e352a2eaaf79
Create Date: 2026-09-21 17:15:55.309063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5fd9b125a318'
down_revision: Union[str, Sequence[str], None] = 'e352a2eaaf79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("work_orders", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_work_orders_amount_positive",
            "amount > 0",
        )


def downgrade() -> None:
    with op.batch_alter_table("work_orders", schema=None) as batch_op:
        batch_op.drop_constraint(
            "ck_work_orders_amount_positive",
            type_="check",
        )