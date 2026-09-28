"""add attachment numbering and audit work order link

Revision ID: de1cf67aa257
Revises: 337c31a3751a
Create Date: 2026-09-23 16:40:14.744035

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de1cf67aa257'
down_revision: Union[str, Sequence[str], None] = '337c31a3751a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Add attachment references, counters, and audit links."""
    connection = op.get_bind()

    # Check existing attachment ownership before changing anything.
    invalid_count = connection.execute(sa.text("""
        SELECT COUNT(*)
        FROM work_order_attachments AS a
        LEFT JOIN work_orders AS w
            ON w.database_id = a.work_order_id
        WHERE w.database_id IS NULL
           OR w.work_order_number IS NULL
           OR w.account_id != a.account_id
    """)).scalar_one()

    if invalid_count:
        raise RuntimeError(
            "Some attachments have missing Work Orders or mismatched accounts"
        )

    # Add the counter without rebuilding the referenced Work Order table.
    op.add_column(
        "work_orders",
        sa.Column(
            "last_attachment_sequence",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )

    # Temporarily nullable so existing attachments can be numbered.
    op.add_column(
        "work_order_attachments",
        sa.Column("attachment_number", sa.String(50), nullable=True),
    )

    attachments = connection.execute(sa.text("""
        SELECT
            a.database_id,
            a.work_order_id,
            w.work_order_number
        FROM work_order_attachments AS a
        JOIN work_orders AS w
            ON w.database_id = a.work_order_id
        ORDER BY a.work_order_id, a.database_id
    """)).mappings().all()

    counters = {}

    for attachment in attachments:
        work_order_id = attachment["work_order_id"]
        sequence = counters.get(work_order_id, 0) + 1
        counters[work_order_id] = sequence

        attachment_number = (
            f"{attachment['work_order_number']}-A{sequence:02d}"
        )

        connection.execute(
            sa.text("""
                UPDATE work_order_attachments
                SET attachment_number = :attachment_number
                WHERE database_id = :attachment_id
            """),
            {
                "attachment_number": attachment_number,
                "attachment_id": attachment["database_id"],
            },
        )

    for work_order_id, sequence in counters.items():
        connection.execute(
            sa.text("""
                UPDATE work_orders
                SET last_attachment_sequence = :sequence
                WHERE database_id = :work_order_id
            """),
            {
                "sequence": sequence,
                "work_order_id": work_order_id,
            },
        )

    # All existing rows now have references.
    with op.batch_alter_table(
        "work_order_attachments",
        table_kwargs={"sqlite_autoincrement": True},
    ) as batch_op:
        batch_op.alter_column(
            "attachment_number",
            existing_type=sa.String(50),
            nullable=False,
        )
        batch_op.create_unique_constraint(
            "uq_work_order_attachments_attachment_number",
            ["attachment_number"],
        )

    with op.batch_alter_table(
        "audit_trail",
        table_kwargs={"sqlite_autoincrement": True},
    ) as batch_op:
        batch_op.add_column(
            sa.Column("work_order_id", sa.Integer(), nullable=True)
        )
        batch_op.create_index(
            "ix_audit_trail_work_order_id",
            ["work_order_id"],
            unique=False,
        )
        batch_op.create_foreign_key(
            "fk_audit_trail_work_order_id",
            "work_orders",
            ["work_order_id"],
            ["database_id"],
        )

    # Link existing Work Order audit entries.
    connection.execute(sa.text("""
        UPDATE audit_trail
        SET work_order_id = (
            SELECT w.database_id
            FROM work_orders AS w
            WHERE w.work_order_number = audit_trail.record_id
              AND w.account_id = audit_trail.account_id
        )
        WHERE table_name = 'work_orders'
    """))

    # Link existing attachment, completion, and emergency audit entries.
    # The table/column names below are fixed migration constants.
    related_tables = (
        ("work_order_attachments", "attachment_number"),
        ("work_order_completion", "completion_number"),
        ("work_order_emergency", "emergency_number"),
    )

    for table_name, reference_column in related_tables:
        connection.execute(
            sa.text(f"""
                UPDATE audit_trail
                SET work_order_id = (
                    SELECT r.work_order_id
                    FROM {table_name} AS r
                    JOIN work_orders AS w
                        ON w.database_id = r.work_order_id
                    WHERE w.account_id = audit_trail.account_id
                      AND (
                          CAST(r.database_id AS VARCHAR)
                              = audit_trail.record_id
                          OR r.{reference_column}
                              = audit_trail.record_id
                      )
                )
                WHERE table_name = :table_name
            """),
            {"table_name": table_name},
        )


def downgrade() -> None:
    """Remove the added columns and constraints."""
    connection = op.get_bind()

    # Native DROP COLUMN avoids rebuilding the referenced Work Order table.
    if connection.dialect.name == "sqlite":
        version = connection.execute(
            sa.text("SELECT sqlite_version()")
        ).scalar_one()

        if tuple(map(int, version.split("."))) < (3, 35, 0):
            raise RuntimeError(
                "This downgrade requires SQLite 3.35 or newer"
            )

    with op.batch_alter_table(
        "audit_trail",
        table_kwargs={"sqlite_autoincrement": True},
    ) as batch_op:
        batch_op.drop_constraint(
            "fk_audit_trail_work_order_id",
            type_="foreignkey",
        )
        batch_op.drop_index("ix_audit_trail_work_order_id")
        batch_op.drop_column("work_order_id")

    with op.batch_alter_table(
        "work_order_attachments",
        table_kwargs={"sqlite_autoincrement": True},
    ) as batch_op:
        batch_op.drop_constraint(
            "uq_work_order_attachments_attachment_number",
            type_="unique",
        )
        batch_op.drop_column("attachment_number")

    op.drop_column("work_orders", "last_attachment_sequence")
