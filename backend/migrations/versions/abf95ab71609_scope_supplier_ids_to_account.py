"""scope supplier IDs to account

Revision ID: abf95ab71609
Revises: cac7376144ea
Create Date: 2026-09-25 11:02:19.698619

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abf95ab71609'
down_revision: Union[str, Sequence[str], None] = 'cac7376144ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_suppliers_supplier_id", table_name="suppliers")
    op.create_index(
        "ix_suppliers_account_supplier_id",
        "suppliers",
        ["account_id", "supplier_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_suppliers_account_supplier_id", table_name="suppliers")
    op.create_index(
        "ix_suppliers_supplier_id",
        "suppliers",
        ["supplier_id"],
        unique=True,
    )