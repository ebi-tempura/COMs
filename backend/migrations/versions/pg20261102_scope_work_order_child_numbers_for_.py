"""Scope work order child numbers for PostgreSQL.

Revision ID: pg20261102
Revises: f3d74af05993
"""

from alembic import op
import sqlalchemy as sa


revision = "pg20261102"
down_revision = "f3d74af05993"
branch_labels = None
depends_on = None


CHANGES = (
    (
        "work_order_attachments",
        "attachment_number",
        ["account_id", "attachment_number"],
        "uq_wo_attachments_account_number",
    ),
    (
        "work_order_completion",
        "completion_number",
        ["work_order_id", "completion_number"],
        "uq_completion_work_order_number",
    ),
    (
        "work_order_emergency",
        "emergency_number",
        ["work_order_id", "emergency_number"],
        "uq_emergency_work_order_number",
    ),
)


def replace_unique(table, old_columns, new_columns, new_name):
    connection = op.get_bind()

    if connection.dialect.name != "postgresql":
        raise RuntimeError(
            "This migration is for PostgreSQL, not the old SQLite database."
        )

    constraints = sa.inspect(connection).get_unique_constraints(
        table, schema="public"
    )

    old_constraints = [
        item for item in constraints
        if set(item["column_names"]) == set(old_columns)
    ]

    new_exists = any(
        set(item["column_names"]) == set(new_columns)
        for item in constraints
    )

    if not old_constraints and not new_exists:
        raise RuntimeError(
            f"Expected uniqueness constraint not found on {table}."
        )

    for constraint in old_constraints:
        op.drop_constraint(
            constraint["name"],
            table,
            type_="unique",
            schema="public",
        )

    if not new_exists:
        op.create_unique_constraint(
            new_name,
            table,
            new_columns,
            schema="public",
        )


def upgrade():
    for table, number_column, scoped_columns, name in CHANGES:
        replace_unique(
            table,
            [number_column],
            scoped_columns,
            name,
        )


def downgrade():
    # This will fail safely if different accounts now share a number:
    # those records cannot satisfy the old global uniqueness rule.
    for table, number_column, scoped_columns, name in reversed(CHANGES):
        replace_unique(
            table,
            scoped_columns,
            [number_column],
            f"uq_{table}_{number_column}_global",
        )