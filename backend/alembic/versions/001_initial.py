"""Initial schema: PostGIS extension + all tables.

Revision ID: 001
Revises:
Create Date: 2026-06-12

Tables are created from the SQLAlchemy metadata so the migration stays in
sync with app/db/models.py for the MVP. Later schema changes should be
proper incremental Alembic revisions.
"""

from alembic import op

from app.db.models import Base

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
