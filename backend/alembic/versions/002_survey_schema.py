"""Survey-grade schema: project CRS fields + survey tables.

Revision ID: 002
Revises: 001
Create Date: 2026-06-12
"""

import sqlalchemy as sa
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"

    for col in (
        sa.Column("engineering_crs_epsg", sa.Integer(), nullable=True),
        sa.Column("accuracy_tier", sa.String(32), server_default="visual", nullable=False),
        sa.Column("origin_lat", sa.Float(), nullable=True),
        sa.Column("origin_lng", sa.Float(), nullable=True),
        sa.Column("offset_e_m", sa.Float(), nullable=True),
        sa.Column("offset_n_m", sa.Float(), nullable=True),
        sa.Column("offset_h_m", sa.Float(), nullable=True),
        sa.Column("survey_mode_enabled", sa.Boolean(), server_default="false", nullable=False),
    ):
        try:
            op.add_column("projects", col)
        except Exception:
            pass

    op.create_table(
        "survey_datasets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("storage_key", sa.String(512), nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("capture_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("crs_epsg", sa.Integer(), nullable=True),
        sa.Column("pixel_size_m", sa.Float(), nullable=True),
        sa.Column("rmse_h_m", sa.Float(), nullable=True),
        sa.Column("rmse_v_m", sa.Float(), nullable=True),
        sa.Column("accuracy_tier", sa.String(32), server_default="gis_grade", nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_survey_datasets_project_id", "survey_datasets", ["project_id"])
    op.create_index("ix_survey_datasets_kind", "survey_datasets", ["kind"])

    op.create_table(
        "engineering_layers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("survey_dataset_id", sa.Integer(), sa.ForeignKey("survey_datasets.id"), nullable=True),
        sa.Column("layer_type", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), server_default="", nullable=False),
        sa.Column("width_m", sa.Float(), nullable=True),
        sa.Column("properties_json", sa.JSON(), nullable=True),
        sa.Column("accuracy_tier", sa.String(32), server_default="gis_grade", nullable=False),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("capture_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("crs_epsg", sa.Integer(), nullable=True),
        sa.Column("pixel_size_m", sa.Float(), nullable=True),
        sa.Column("rmse_h_m", sa.Float(), nullable=True),
        sa.Column("rmse_v_m", sa.Float(), nullable=True),
        sa.Column("geom_geojson", sa.JSON(), nullable=True),
        sa.Column("geom_wgs84_geojson", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_engineering_layers_project_id", "engineering_layers", ["project_id"])
    op.create_index("ix_engineering_layers_layer_type", "engineering_layers", ["layer_type"])

    if is_pg:
        op.execute("SELECT PostGIS_Version()")
        op.execute(
            "ALTER TABLE engineering_layers ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 0)"
        )

    op.create_table(
        "ground_control_points",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("source", sa.String(32), server_default="manual", nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("ellipsoid_h_m", sa.Float(), nullable=True),
        sa.Column("easting_m", sa.Float(), nullable=True),
        sa.Column("northing_m", sa.Float(), nullable=True),
        sa.Column("orthometric_h_m", sa.Float(), nullable=True),
        sa.Column("horizontal_accuracy_m", sa.Float(), nullable=True),
        sa.Column("vertical_accuracy_m", sa.Float(), nullable=True),
        sa.Column("map_derived_e_m", sa.Float(), nullable=True),
        sa.Column("map_derived_n_m", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ground_control_points_project_id", "ground_control_points", ["project_id"])

    op.create_table(
        "accuracy_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("tier_result", sa.String(32), nullable=False),
        sa.Column("passed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("report_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_accuracy_reports_project_id", "accuracy_reports", ["project_id"])


def downgrade() -> None:
    op.drop_table("accuracy_reports")
    op.drop_table("ground_control_points")
    op.drop_table("engineering_layers")
    op.drop_table("survey_datasets")
    for col in (
        "survey_mode_enabled",
        "offset_h_m",
        "offset_n_m",
        "offset_e_m",
        "origin_lng",
        "origin_lat",
        "accuracy_tier",
        "engineering_crs_epsg",
    ):
        try:
            op.drop_column("projects", col)
        except Exception:
            pass
