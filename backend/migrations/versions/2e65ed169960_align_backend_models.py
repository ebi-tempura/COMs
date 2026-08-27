"""Align backend models

Revision ID: 2e65ed169960
Revises: 3de36c3873dd
Create Date: 2026-08-27 16:03:47.807198

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e65ed169960'
down_revision: Union[str, Sequence[str], None] = '3de36c3873dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    with op.batch_alter_table("work_orders") as batch_op:
        batch_op.alter_column(
            "create_time",
            new_column_name="created_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            nullable=False,
        )
        batch_op.alter_column(
            "description",
            existing_type=sa.String(length=2000),
            nullable=False,
        )
        batch_op.alter_column(
            "type",
            existing_type=sa.String(length=20),
            nullable=False,
        )
        batch_op.alter_column(
            "category",
            existing_type=sa.String(length=100),
            nullable=False,
        )
        batch_op.alter_column(
            "location",
            existing_type=sa.String(length=200),
            nullable=False,
        )
        batch_op.alter_column(
            "target_date",
            existing_type=sa.Date(),
            nullable=False,
        )

    with op.batch_alter_table("suppliers") as batch_op:
        batch_op.alter_column(
            "create_time",
            new_column_name="created_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            nullable=False,
        )

        required_columns = {
            "supplier_type": sa.String(length=200),
            "supplier_name": sa.String(length=200),
            "service_category": sa.String(length=200),
            "contact": sa.String(length=200),
            "phone": sa.String(length=30),
            "email": sa.String(length=200),
            "RFC": sa.String(length=13),
            "address": sa.String(length=500),
            "clabe": sa.String(length=18),
            "payment_method": sa.String(length=200),
        }

        for column_name, column_type in required_columns.items():
            batch_op.alter_column(
                column_name,
                existing_type=column_type,
                nullable=False,
            )

    with op.batch_alter_table("work_order_completion") as batch_op:
        batch_op.alter_column(
            "create_time",
            new_column_name="created_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            nullable=False,
        )
        batch_op.alter_column(
            "work_performed_Date",
            new_column_name="work_performed_date",
            existing_type=sa.Date(),
            nullable=False,
        )
        batch_op.alter_column(
            "work_performed_description",
            existing_type=sa.String(length=500),
            nullable=False,
        )
        batch_op.alter_column(
            "work_performed_observation",
            existing_type=sa.String(length=500),
            nullable=False,
        )

    with op.batch_alter_table("work_order_emergency") as batch_op:
        batch_op.alter_column(
            "create_time",
            new_column_name="created_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            nullable=False,
        )

        required_columns = {
            "wo_emergency_what": sa.String(length=500),
            "wo_emergency_where": sa.String(length=500),
            "wo_emergency_when": sa.Date(),
            "wo_emergency_who": sa.String(length=500),
            "wo_emergency_why": sa.String(length=500),
            "wo_emergency_howmany": sa.String(length=500),
            "wo_emergency_howmuch": sa.String(length=500),
        }

        for column_name, column_type in required_columns.items():
            batch_op.alter_column(
                column_name,
                existing_type=column_type,
                nullable=False,
            )

def downgrade() -> None:
    """Downgrade schema."""

    with op.batch_alter_table("work_orders") as batch_op:
        batch_op.alter_column(
            "created_at",
            new_column_name="create_time",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            nullable=True,
        )
        batch_op.alter_column(
            "description",
            existing_type=sa.String(length=2000),
            nullable=True,
        )
        batch_op.alter_column(
            "type",
            existing_type=sa.String(length=20),
            nullable=True,
        )
        batch_op.alter_column(
            "category",
            existing_type=sa.String(length=100),
            nullable=True,
        )
        batch_op.alter_column(
            "location",
            existing_type=sa.String(length=200),
            nullable=True,
        )
        batch_op.alter_column(
            "target_date",
            existing_type=sa.Date(),
            nullable=True,
        )

    with op.batch_alter_table("suppliers") as batch_op:
        batch_op.alter_column(
            "created_at",
            new_column_name="create_time",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            nullable=True,
        )

        optional_columns = {
            "supplier_type": sa.String(length=200),
            "supplier_name": sa.String(length=200),
            "service_category": sa.String(length=200),
            "contact": sa.String(length=200),
            "phone": sa.String(length=30),
            "email": sa.String(length=200),
            "RFC": sa.String(length=13),
            "address": sa.String(length=500),
            "clabe": sa.String(length=18),
            "payment_method": sa.String(length=200),
        }

        for column_name, column_type in optional_columns.items():
            batch_op.alter_column(
                column_name,
                existing_type=column_type,
                nullable=True,
            )

    with op.batch_alter_table("work_order_completion") as batch_op:
        batch_op.alter_column(
            "created_at",
            new_column_name="create_time",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            nullable=True,
        )
        batch_op.alter_column(
            "work_performed_date",
            new_column_name="work_performed_Date",
            existing_type=sa.Date(),
            nullable=True,
        )
        batch_op.alter_column(
            "work_performed_description",
            existing_type=sa.String(length=500),
            nullable=True,
        )
        batch_op.alter_column(
            "work_performed_observation",
            existing_type=sa.String(length=500),
            nullable=True,
        )

    with op.batch_alter_table("work_order_emergency") as batch_op:
        batch_op.alter_column(
            "created_at",
            new_column_name="create_time",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            nullable=True,
        )

        optional_columns = {
            "wo_emergency_what": sa.String(length=500),
            "wo_emergency_where": sa.String(length=500),
            "wo_emergency_when": sa.Date(),
            "wo_emergency_who": sa.String(length=500),
            "wo_emergency_why": sa.String(length=500),
            "wo_emergency_howmany": sa.String(length=500),
            "wo_emergency_howmuch": sa.String(length=500),
        }

        for column_name, column_type in optional_columns.items():
            batch_op.alter_column(
                column_name,
                existing_type=column_type,
                nullable=True,
            )