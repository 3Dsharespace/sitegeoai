"""Incremental schema: auth, audit, usage tracking."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"

    inspector = inspect(bind)

    if is_pg:
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free' NOT NULL")
    else:
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        with op.batch_alter_table("users") as batch_op:
            if "password_hash" not in user_cols:
                batch_op.add_column(sa.Column("password_hash", sa.String(255), nullable=True))
            if "role" not in user_cols:
                batch_op.add_column(sa.Column("role", sa.String(20), server_default="user", nullable=False))
            if "plan" not in user_cols:
                batch_op.add_column(sa.Column("plan", sa.String(20), server_default="free", nullable=False))

    if not inspector.has_table("audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True, index=True),
            sa.Column("action", sa.String(100), nullable=False, index=True),
            sa.Column("entity_type", sa.String(100), nullable=True, index=True),
            sa.Column("entity_id", sa.String(100), nullable=True),
            sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=True, index=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("ip_address", sa.String(64), nullable=True),
            sa.Column("user_agent", sa.String(512), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, index=True),
        )

    if not inspector.has_table("usage_events"):
        op.create_table(
            "usage_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
            sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=True, index=True),
            sa.Column("event_type", sa.String(64), nullable=False, index=True),
            sa.Column("units", sa.Integer(), server_default="1", nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, index=True),
        )


def downgrade() -> None:
    op.drop_table("usage_events")
    op.drop_table("audit_logs")
