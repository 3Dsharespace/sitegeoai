from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

from app.db.session import IS_POSTGRES

Base = declarative_base()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    project_type = Column(String(50), nullable=False)  # flyover|building|pipeline|road|...
    status = Column(String(50), default="draft", nullable=False)
    units = Column(String(20), default="metric", nullable=False)
    location_name = Column(String(500), default="")
    center_lat = Column(Float, nullable=True)
    center_lng = Column(Float, nullable=True)
    # GeoJSON geometry is the source of truth in the API layer; on PostGIS we
    # additionally maintain a true geometry column for spatial queries.
    boundary_geojson = Column(JSON, nullable=True)   # Polygon
    alignment_geojson = Column(JSON, nullable=True)  # LineString (roads/pipelines/flyovers)
    # Survey workspace — engineering geometry stored in projected CRS (UTM)
    engineering_crs_epsg = Column(Integer, nullable=True)
    accuracy_tier = Column(String(32), default="visual", nullable=False)
    origin_lat = Column(Float, nullable=True)
    origin_lng = Column(Float, nullable=True)
    offset_e_m = Column(Float, nullable=True)
    offset_n_m = Column(Float, nullable=True)
    offset_h_m = Column(Float, nullable=True)
    survey_mode_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    site_analyses = relationship("SiteAnalysis", back_populates="project", cascade="all, delete-orphan")
    scenarios = relationship("DesignScenario", back_populates="project", cascade="all, delete-orphan")
    files = relationship("GeneratedFile", back_populates="project", cascade="all, delete-orphan")
    survey_datasets = relationship("SurveyDataset", back_populates="project", cascade="all, delete-orphan")
    engineering_layers = relationship("EngineeringLayer", back_populates="project", cascade="all, delete-orphan")
    ground_control_points = relationship("GroundControlPoint", back_populates="project", cascade="all, delete-orphan")
    accuracy_reports = relationship("AccuracyReport", back_populates="project", cascade="all, delete-orphan")


if IS_POSTGRES:
    from geoalchemy2 import Geometry

    Project.boundary_geom = Column("boundary_geom", Geometry("POLYGON", srid=4326), nullable=True)


class SiteAnalysis(Base):
    __tablename__ = "site_analyses"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    area_sqm = Column(Float, nullable=True)
    perimeter_m = Column(Float, nullable=True)
    elevation_min_m = Column(Float, nullable=True)
    elevation_max_m = Column(Float, nullable=True)
    slope_percent_estimate = Column(Float, nullable=True)
    nearby_roads_json = Column(JSON, nullable=True)
    existing_buildings_json = Column(JSON, nullable=True)
    risks_json = Column(JSON, nullable=True)
    raw_geojson = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="site_analyses")


class DesignScenario(Base):
    __tablename__ = "design_scenarios"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    input_parameters_json = Column(JSON, nullable=True)
    design_output_json = Column(JSON, nullable=True)
    assumptions_json = Column(JSON, nullable=True)
    status = Column(String(50), default="pending", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="scenarios")
    estimates = relationship("QuantityEstimate", back_populates="scenario", cascade="all, delete-orphan")


class QuantityEstimate(Base):
    __tablename__ = "quantity_estimates"

    id = Column(Integer, primary_key=True)
    design_scenario_id = Column(Integer, ForeignKey("design_scenarios.id"), nullable=False, index=True)
    concrete_m3 = Column(Float, default=0)
    cement_bags = Column(Float, default=0)
    steel_kg = Column(Float, default=0)
    rebar_kg = Column(Float, default=0)
    excavation_m3 = Column(Float, default=0)
    backfill_m3 = Column(Float, default=0)
    formwork_sqm = Column(Float, default=0)
    asphalt_m3 = Column(Float, default=0)
    pipe_length_m = Column(Float, default=0)
    pipe_diameter_mm = Column(Float, default=0)
    total_cost_estimate = Column(Float, default=0)
    line_items_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    scenario = relationship("DesignScenario", back_populates="estimates")


class GeneratedFile(Base):
    __tablename__ = "generated_files"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    design_scenario_id = Column(Integer, ForeignKey("design_scenarios.id"), nullable=True)
    file_type = Column(String(50), nullable=False)  # glb|pdf|csv|json|geojson
    file_url = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="files")


class RateItem(Base):
    __tablename__ = "rate_items"

    id = Column(Integer, primary_key=True)
    region = Column(String(100), default="default", nullable=False)
    item_code = Column(String(50), nullable=False, index=True)
    item_name = Column(String(255), nullable=False)
    unit = Column(String(20), nullable=False)
    rate = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ProjectTemplate(Base):
    __tablename__ = "project_templates"

    id = Column(Integer, primary_key=True)
    project_type = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    default_parameters_json = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SurveyDataset(Base):
    __tablename__ = "survey_datasets"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    kind = Column(String(32), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=True)
    source = Column(String(255), nullable=True)
    capture_date = Column(DateTime(timezone=True), nullable=True)
    crs_epsg = Column(Integer, nullable=True)
    pixel_size_m = Column(Float, nullable=True)
    rmse_h_m = Column(Float, nullable=True)
    rmse_v_m = Column(Float, nullable=True)
    accuracy_tier = Column(String(32), default="gis_grade", nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project = relationship("Project", back_populates="survey_datasets")
    layers = relationship("EngineeringLayer", back_populates="survey_dataset")


class EngineeringLayer(Base):
    __tablename__ = "engineering_layers"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    survey_dataset_id = Column(Integer, ForeignKey("survey_datasets.id"), nullable=True, index=True)
    layer_type = Column(String(64), nullable=False, index=True)
    name = Column(String(255), default="", nullable=False)
    width_m = Column(Float, nullable=True)
    properties_json = Column(JSON, nullable=True)
    accuracy_tier = Column(String(32), default="gis_grade", nullable=False)
    source = Column(String(255), nullable=True)
    capture_date = Column(DateTime(timezone=True), nullable=True)
    crs_epsg = Column(Integer, nullable=True)
    pixel_size_m = Column(Float, nullable=True)
    rmse_h_m = Column(Float, nullable=True)
    rmse_v_m = Column(Float, nullable=True)
    geom_geojson = Column(JSON, nullable=True)
    geom_wgs84_geojson = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project = relationship("Project", back_populates="engineering_layers")
    survey_dataset = relationship("SurveyDataset", back_populates="layers")


if IS_POSTGRES:
    EngineeringLayer.geom = Column("geom", Geometry("GEOMETRY", srid=0), nullable=True)


class GroundControlPoint(Base):
    __tablename__ = "ground_control_points"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    source = Column(String(32), default="manual", nullable=False)
    lng = Column(Float, nullable=False)
    lat = Column(Float, nullable=False)
    ellipsoid_h_m = Column(Float, nullable=True)
    easting_m = Column(Float, nullable=True)
    northing_m = Column(Float, nullable=True)
    orthometric_h_m = Column(Float, nullable=True)
    horizontal_accuracy_m = Column(Float, nullable=True)
    vertical_accuracy_m = Column(Float, nullable=True)
    map_derived_e_m = Column(Float, nullable=True)
    map_derived_n_m = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="ground_control_points")


class AccuracyReport(Base):
    __tablename__ = "accuracy_reports"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    tier_result = Column(String(32), nullable=False)
    passed = Column(Boolean, default=False, nullable=False)
    report_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="accuracy_reports")
