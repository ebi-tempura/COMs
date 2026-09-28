"""allow work order number during creation

Revision ID: 87236c1e7fa6
Revises: aa81d99c071e
Create Date: 2026-09-22 18:23:07.396490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87236c1e7fa6'
down_revision: Union[str, Sequence[str], None] = 'aa81d99c071e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table("work_orders", schema=None) as batch_op:
        batch_op.alter_column(
            "work_order_number",
            existing_type=sa.VARCHAR(length=20),
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("work_orders", schema=None) as batch_op:
        batch_op.alter_column(
            "work_order_number",
            existing_type=sa.VARCHAR(length=20),
            nullable=False,
        )