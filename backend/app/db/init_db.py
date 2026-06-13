"""Create tables and seed baseline data (dev user, default rates, templates).

In production with PostGIS, prefer `alembic upgrade head`; this module is the
idempotent dev path that also runs on SQLite fallback.
"""

import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.models import Base, ProjectTemplate, RateItem, User
from app.db.session import IS_POSTGRES, SessionLocal, engine

logger = logging.getLogger(__name__)

DEMO_PROJECT_ID = 5

DEFAULT_RATES = [
    # (item_code, item_name, unit, rate INR)
    ("CONC-M25", "Concrete M25 (supply + place)", "m3", 7500.0),
    ("CONC-M35", "Concrete M35 (supply + place)", "m3", 8500.0),
    ("STEEL-FE500", "Reinforcement steel Fe500", "kg", 75.0),
    ("CEMENT-BAG", "Cement bag 50kg (OPC 43)", "bag", 420.0),
    ("EXC-SOIL", "Excavation in ordinary soil", "m3", 250.0),
    ("BACKFILL", "Backfill with compaction", "m3", 180.0),
    ("FORMWORK", "Formwork / shuttering", "sqm", 650.0),
    ("ASPHALT", "Asphalt / bituminous concrete", "m3", 11000.0),
    ("PIPE-RCC-600", "RCC pipe 600mm dia", "m", 2200.0),
    ("PIPE-HDPE-300", "HDPE pipe 300mm dia", "m", 1400.0),
    ("BEDDING-SAND", "Sand bedding for pipes", "m3", 900.0),
    ("ROAD-BASE", "Granular sub-base / WMM", "m3", 1800.0),
    ("BARRIER", "Crash barrier / parapet", "m", 3500.0),
]

DEFAULT_TEMPLATES = [
    ("flyover", "Default 4-lane flyover", {
        "length_m": 500, "deck_width_m": 16, "lanes": 4, "clearance_m": 5.5,
        "pier_spacing_m": 30, "deck_thickness_m": 0.6, "concrete_grade": "M35",
        "steel_grade": "Fe500", "asphalt_thickness_mm": 80,
        "foundation_depth_m_assumed": 8,
    }),
    ("building", "Default G+3 building massing", {
        "builtup_area_sqm": 400, "floors": 4, "floor_height_m": 3.2,
        "slab_thickness_m": 0.15, "column_grid_m": 5, "concrete_grade": "M25",
        "steel_grade": "Fe500", "foundation_factor": 0.3,
    }),
    ("pipeline", "Default 600mm drainage line", {
        "pipe_diameter_mm": 600, "trench_width_m": 1.2, "trench_depth_m": 2.0,
        "bedding_thickness_m": 0.15, "pipe_material": "RCC",
        "manhole_spacing_m": 30,
    }),
    ("road", "Default 2-lane road segment", {
        "road_width_m": 7.5, "lanes": 2, "asphalt_thickness_mm": 80,
        "base_thickness_mm": 250, "shoulder_width_m": 1.5,
    }),
]


def _migrate_sqlite_schema() -> None:
    """Add columns/tables missing from older SQLite dev databases."""
    if IS_POSTGRES:
        return
    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(projects)")).fetchall()
        existing = {row[1] for row in rows}
        additions = {
            "engineering_crs_epsg": "INTEGER",
            "accuracy_tier": "VARCHAR(32) DEFAULT 'visual'",
            "origin_lat": "FLOAT",
            "origin_lng": "FLOAT",
            "offset_e_m": "FLOAT",
            "offset_n_m": "FLOAT",
            "offset_h_m": "FLOAT",
            "survey_mode_enabled": "BOOLEAN DEFAULT 0",
        }
        for col, ddl in additions.items():
            if col not in existing:
                conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col} {ddl}"))
        conn.commit()


def init_db() -> None:
    if IS_POSTGRES:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            conn.commit()
            # Add survey columns to existing projects table if missing
            for col_sql in (
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS engineering_crs_epsg INTEGER",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS accuracy_tier VARCHAR(32) DEFAULT 'visual'",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS origin_lat DOUBLE PRECISION",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS origin_lng DOUBLE PRECISION",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS offset_e_m DOUBLE PRECISION",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS offset_n_m DOUBLE PRECISION",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS offset_h_m DOUBLE PRECISION",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS survey_mode_enabled BOOLEAN DEFAULT FALSE",
            ):
                conn.execute(text(col_sql))
            conn.commit()
    _migrate_sqlite_schema()
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(User(id=1, name="Dev User", email="dev@example.com"))
        if db.query(RateItem).count() == 0:
            for code, name, unit, rate in DEFAULT_RATES:
                db.add(RateItem(region="default", item_code=code, item_name=name, unit=unit, rate=rate))
        if db.query(ProjectTemplate).count() == 0:
            for ptype, name, params in DEFAULT_TEMPLATES:
                db.add(ProjectTemplate(project_type=ptype, name=name, default_parameters_json=params))
        from app.db.demo_seed import ensure_demo_project

        ensure_demo_project(db)
        db.commit()
        logger.info("Database initialized (postgis=%s)", IS_POSTGRES)
    finally:
        db.close()
