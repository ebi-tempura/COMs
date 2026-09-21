"""add readable completion and emergency identifiers

Revision ID: b5e81cf4a7d2
Revises: 80c3ae670b64
Create Date: 2026-09-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b5e81cf4a7d2"
down_revision: Union[str, Sequence[str], None] = "80c3ae670b64"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("work_order_completion", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("completion_number", sa.String(length=30), nullable=True)
        )

    with op.batch_alter_table("work_order_emergency", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("emergency_number", sa.String(length=30), nullable=True)
        )

    op.execute(
        """
        WITH numbered_completions AS (
            SELECT
                completion.database_id,
                work_order.work_order_number
                    || "-C"
                    || printf(
                        "%02d",
                        (
                            SELECT COUNT(*)
                            FROM work_order_completion AS earlier_completion
                            WHERE earlier_completion.work_order_id
                                  = completion.work_order_id
                              AND earlier_completion.database_id
                                  <= completion.database_id
                        )
                    ) AS completion_number
            FROM work_order_completion AS completion
            JOIN work_orders AS work_order
              ON work_order.database_id = completion.work_order_id
        )
        UPDATE work_order_completion
        SET completion_number = (
            SELECT numbered_completions.completion_number
            FROM numbered_completions
            WHERE numbered_completions.database_id
                  = work_order_completion.database_id
        )
        """
    )

    op.execute(
        """
        WITH numbered_emergencies AS (
            SELECT
                emergency.database_id,
                work_order.work_order_number
                    || "-E"
                    || printf(
                        "%02d",
                        (
                            SELECT COUNT(*)
                            FROM work_order_emergency AS earlier_emergency
                            WHERE earlier_emergency.work_order_id
                                  = emergency.work_order_id
                              AND earlier_emergency.database_id
                                  <= emergency.database_id
                        )
                    ) AS emergency_number
            FROM work_order_emergency AS emergency
            JOIN work_orders AS work_order
              ON work_order.database_id = emergency.work_order_id
        )
        UPDATE work_order_emergency
        SET emergency_number = (
            SELECT numbered_emergencies.emergency_number
            FROM numbered_emergencies
            WHERE numbered_emergencies.database_id
                  = work_order_emergency.database_id
        )
        """
    )

    with op.batch_alter_table("work_order_completion", schema=None) as batch_op:
        batch_op.alter_column("completion_number", nullable=False)
        batch_op.create_unique_constraint(
            "uq_work_order_completion_completion_number",
            ["completion_number"],
        )

    with op.batch_alter_table("work_order_emergency", schema=None) as batch_op:
        batch_op.alter_column("emergency_number", nullable=False)
        batch_op.create_unique_constraint(
            "uq_work_order_emergency_emergency_number",
            ["emergency_number"],
        )


def downgrade() -> None:
    with op.batch_alter_table("work_order_emergency", schema=None) as batch_op:
        batch_op.drop_constraint(
            "uq_work_order_emergency_emergency_number",
            type_="unique",
        )
        batch_op.drop_column("emergency_number")

    with op.batch_alter_table("work_order_completion", schema=None) as batch_op:
        batch_op.drop_constraint(
            "uq_work_order_completion_completion_number",
            type_="unique",
        )
        batch_op.drop_column("completion_number")
