"""Add verified user invitations.

Revision ID: f126a5c70801
Revises: 0e94edd3b860
"""
from alembic import op
import sqlalchemy as sa
revision = "f126a5c70801"
down_revision = "0e94edd3b860"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("user_invitations",
        sa.Column("database_id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.String(50), sa.ForeignKey("building_account.account_id"), nullable=False),
        sa.Column("email", sa.String(50), nullable=False),
        sa.Column("user_role", sa.String(50), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("User_table.database_id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_user_invitations_account_id", "user_invitations", ["account_id"])

def downgrade():
    op.drop_table("user_invitations")
