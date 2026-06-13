"""Ensure the Bengaluru flyover demo project exists (id=5 for frontend links)."""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

from app.services.ai import providers
from app.services.ai.safety_guardrails import enforce
from app.services.calculations import boq, timeline
from app.services.design import flyover_generator
from app.services.exports.gltf_export import generate_glb
from app.services.storage import save_file

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.db.models import Project

logger = logging.getLogger(__name__)

DEMO_PROJECT_ID = 5
DEMO_NAME = "Demo Flyover (Bengaluru)"

DEMO_BOUNDARY = {
    "type": "Polygon",
    "coordinates": [[
        [77.5920, 12.9700],
        [77.5975, 12.9700],
        [77.5975, 12.9735],
        [77.5920, 12.9735],
        [77.5920, 12.9700],
    ]],
}

DEMO_ALIGNMENT = {
    "type": "LineString",
    "coordinates": [
        [77.5925, 12.9710],
        [77.59475, 12.97175],
        [77.5970, 12.9725],
    ],
}

DEMO_PARAMS = {
    "length_m": 500,
    "deck_width_m": 16,
    "lanes": 4,
    "clearance_m": 5.5,
    "pier_spacing_m": 30,
    "foundation_depth_m_assumed": 8,
    "concrete_grade": "M35",
    "steel_grade": "Fe500",
    "asphalt_thickness_mm": 80,
}


def _sync_postgis_boundary(db: Session, project_id: int, boundary: dict) -> None:
    from sqlalchemy import text

    from app.db.session import IS_POSTGRES

    if not IS_POSTGRES:
        return
    db.execute(
        text("UPDATE projects SET boundary_geom = ST_SetSRID(ST_GeomFromGeoJSON(:gj), 4326) WHERE id = :id"),
        {"gj": json.dumps(boundary), "id": project_id},
    )


def _seed_demo_design(db: Session, project: Project) -> None:
    from app.db.models import DesignScenario, GeneratedFile, QuantityEstimate

    scenario = (
        db.query(DesignScenario)
        .filter(DesignScenario.project_id == project.id, DesignScenario.name == "Demo Scenario")
        .first()
    )
    if scenario and scenario.status == "completed" and scenario.design_output_json:
        return

    if not scenario:
        scenario = DesignScenario(
            project_id=project.id,
            name="Demo Scenario",
            input_parameters_json=DEMO_PARAMS,
            status="running",
        )
        db.add(scenario)
        db.flush()

    design = enforce(providers._mock_generate("flyover", DEMO_PARAMS))
    design["ai_provider"] = "mock-seed"
    result = flyover_generator.generate(DEMO_PARAMS, design)
    quantities = result["quantities"]
    boq_result = boq.build_boq(db, result["boq_inputs"])
    driver_name, driver_value = result["timeline_driver"]
    schedule = timeline.estimate_months("flyover", driver_value)

    design["calculated"] = {
        "quantities": quantities,
        "derived": result["derived"],
        "timeline": schedule,
        "cost_summary": boq_result["cost_summary"],
    }
    design["geometry_spec"] = result["geometry_spec"]

    spec = result["geometry_spec"]
    main_spec = {**spec, "objects": [o for o in spec["objects"] if o.get("layer") != "excavation"]}
    exc_spec = {**spec, "objects": [o for o in spec["objects"] if o.get("layer") == "excavation"]}
    prefix = f"projects/{project.id}/scenario_{scenario.id}"

    has_glb = (
        db.query(GeneratedFile)
        .filter(GeneratedFile.project_id == project.id, GeneratedFile.file_type == "glb")
        .first()
    )
    if not has_glb:
        glb_url = save_file(f"{prefix}/model.glb", generate_glb(main_spec), "model/gltf-binary")
        db.add(
            GeneratedFile(
                project_id=project.id,
                design_scenario_id=scenario.id,
                file_type="glb",
                file_url=glb_url,
                metadata_json={"frame": "local_meters", "provider": "mock-seed"},
            )
        )
        if exc_spec["objects"]:
            exc_url = save_file(f"{prefix}/excavation.glb", generate_glb(exc_spec), "model/gltf-binary")
            db.add(
                GeneratedFile(
                    project_id=project.id,
                    design_scenario_id=scenario.id,
                    file_type="glb-excavation",
                    file_url=exc_url,
                    metadata_json={"frame": "local_meters"},
                )
            )

    existing_est = (
        db.query(QuantityEstimate)
        .filter(QuantityEstimate.design_scenario_id == scenario.id)
        .first()
    )
    if not existing_est:
        db.add(
            QuantityEstimate(
                design_scenario_id=scenario.id,
                **quantities,
                total_cost_estimate=boq_result["cost_summary"]["total_medium"],
                line_items_json=boq_result["line_items"],
            )
        )

    scenario.design_output_json = design
    scenario.assumptions_json = design["assumptions"]
    scenario.status = "completed"
    project.status = "designed"


def _seed_site_analysis(db: Session, project: Project) -> None:
    from app.db.models import SiteAnalysis

    existing = db.query(SiteAnalysis).filter(SiteAnalysis.project_id == project.id).first()
    if existing:
        return
    db.add(
        SiteAnalysis(
            project_id=project.id,
            area_sqm=420_000,
            perimeter_m=2_600,
            elevation_min_m=920,
            elevation_max_m=945,
            slope_percent_estimate=2.5,
            risks_json=[
                {"type": "traffic", "detail": "High traffic corridor — diversion planning required"},
                {"type": "utilities", "detail": "Underground utilities not verified"},
            ],
        )
    )


def ensure_demo_project(db: Session) -> Project | None:
    from app.db.models import Project

    project = db.get(Project, DEMO_PROJECT_ID)
    if project and project.name == DEMO_NAME:
        _seed_site_analysis(db, project)
        _seed_demo_design(db, project)
        _sync_postgis_boundary(db, project.id, DEMO_BOUNDARY)
        return project

    by_name = db.query(Project).filter(Project.name == DEMO_NAME).first()
    if by_name:
        _seed_site_analysis(db, by_name)
        _seed_demo_design(db, by_name)
        if by_name.boundary_geojson:
            _sync_postgis_boundary(db, by_name.id, by_name.boundary_geojson)
        logger.info("Demo project exists as id=%s (frontend links use id=%s)", by_name.id, DEMO_PROJECT_ID)
        return by_name

    if project:
        logger.warning("Project id=%s exists but is not the demo; skipping demo seed", DEMO_PROJECT_ID)
        return None

    project = Project(
        id=DEMO_PROJECT_ID,
        user_id=1,
        name=DEMO_NAME,
        project_type="flyover",
        status="draft",
        units="metric",
        location_name="MG Road area, Bengaluru, India",
        center_lat=12.97175,
        center_lng=77.59475,
        boundary_geojson=DEMO_BOUNDARY,
        alignment_geojson=DEMO_ALIGNMENT,
    )
    db.add(project)
    db.flush()
    _seed_site_analysis(db, project)
    _seed_demo_design(db, project)
    _sync_postgis_boundary(db, project.id, DEMO_BOUNDARY)
    logger.info("Seeded demo project id=%s", DEMO_PROJECT_ID)
    return project
