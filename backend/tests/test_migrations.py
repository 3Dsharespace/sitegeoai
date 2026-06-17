"""Alembic migration smoke tests."""

import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def test_alembic_upgrade_head_sqlite(tmp_path):
    db_path = tmp_path / "migration_test.db"
    url = f"sqlite:///{db_path.as_posix()}"

    env = os.environ.copy()
    env["DATABASE_URL"] = url

    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_ROOT,
        env=env,
        check=True,
    )

    engine = create_engine(url)
    with engine.connect() as conn:
        version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        assert version == "003"

        inspector = inspect(conn)
        for table in (
            "users",
            "projects",
            "survey_datasets",
            "engineering_layers",
            "audit_logs",
            "usage_events",
        ):
            assert inspector.has_table(table), f"missing table {table}"

        user_cols = {c["name"] for c in inspector.get_columns("users")}
        assert {"password_hash", "role", "plan"}.issubset(user_cols)
