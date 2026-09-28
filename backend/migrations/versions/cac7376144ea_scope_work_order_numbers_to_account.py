"""scope work order numbers to account

Revision ID: cac7376144ea
Revises: de1cf67aa257
Create Date: 2026-09-25 07:53:28.552663

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cac7376144ea'
down_revision: Union[str, Sequence[str], None] = 'de1cf67aa257'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    op.drop_index(
        "ix_work_orders_work_order_number",
        table_name="work_orders",
    )
    op.create_index(
        "ix_work_orders_account_number",
        "work_orders",
        ["account_id", "work_order_number"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_work_orders_account_number",
        table_name="work_orders",
    )
    op.create_index(
        "ix_work_orders_work_order_number",
        "work_orders",
        ["work_order_number"],
        unique=True,
    )