"""Fix work order number uniqueness per account

Revision ID: 49ab0bd6c72d
Revises: f126a5c70801
Create Date: 2026-10-12 07:57:54.084532

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49ab0bd6c72d'
down_revision: Union[str, Sequence[str], None] = 'f126a5c70801'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.drop_index(
        "ix_work_orders_work_order_number",
        table_name="work_orders",
    )
    op.create_index(
        "ix_work_orders_work_order_number",
        "work_orders",
        ["work_order_number"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_work_orders_work_order_number",
        table_name="work_orders",
    )
    op.create_index(
        "ix_work_orders_work_order_number",
        "work_orders",
        ["work_order_number"],
        unique=True,
    )
