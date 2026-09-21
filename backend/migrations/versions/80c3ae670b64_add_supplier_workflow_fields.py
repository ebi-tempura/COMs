"""add supplier workflow fields

Revision ID: 80c3ae670b64
Revises: ea1ce3035cba
Create Date: 2026-09-20 10:33:06.725735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80c3ae670b64'
down_revision: Union[str, Sequence[str], None] = 'ea1ce3035cba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("suppliers", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "status",
                sa.String(length=50),
                server_default="Draft",
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column(
                "created_by_user_id",
                sa.Integer(),
                nullable=True,
            )
        )
        batch_op.create_index(
            batch_op.f("ix_suppliers_created_by_user_id"),
            ["created_by_user_id"],
            unique=False,
        )
        batch_op.create_foreign_key(
            "fk_suppliers_created_by_user_id",
            "User_table",
            ["created_by_user_id"],
            ["database_id"],
        )

    # Preserve pre-workflow suppliers as approved legacy records.
    op.execute(
        "UPDATE suppliers "
        "SET status = 'Approved' "
        "WHERE created_by_user_id IS NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("suppliers", schema=None) as batch_op:
        batch_op.drop_constraint(
            "fk_suppliers_created_by_user_id",
            type_="foreignkey",
        )
        batch_op.drop_index(
            batch_op.f("ix_suppliers_created_by_user_id")
        )
        batch_op.drop_column("created_by_user_id")
        batch_op.drop_column("status")
    # ### end Alembic commands ###
