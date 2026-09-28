"""remove global supplier uniqueness

Revision ID: e8535b1911f9
Revises: d5c4ed8e2e9b
Create Date: 2026-09-21 16:27:46.384266

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8535b1911f9'
down_revision: Union[str, Sequence[str], None] = 'd5c4ed8e2e9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table(
        "suppliers",
        schema=None,
        naming_convention={
            "uq": "uq_%(table_name)s_%(column_0_name)s",
        },
    ) as batch_op:
        batch_op.drop_constraint("uq_suppliers_email", type_="unique")
        batch_op.drop_constraint("uq_suppliers_rfc", type_="unique")
        batch_op.drop_constraint("uq_suppliers_clabe", type_="unique")


def downgrade() -> None:
    with op.batch_alter_table("suppliers", schema=None) as batch_op:
        batch_op.create_unique_constraint("uq_suppliers_email", ["email"])
        batch_op.create_unique_constraint("uq_suppliers_rfc", ["rfc"])
        batch_op.create_unique_constraint("uq_suppliers_clabe", ["clabe"])