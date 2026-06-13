"""AI design orchestration pipeline.

validate inputs -> fetch site context -> LLM structured JSON -> schema
validation -> guardrails -> deterministic calculators -> 3D model -> persist.
The LLM never produces final numbers: quantities/costs come from
app.services.calculations and app.services.design generators.
"""

import logging

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.models import DesignScenario, GeneratedFile, Project, QuantityEstimate, SiteAnalysis
from app.services.ai import prompts, providers, safety_guardrails
from app.services.ai.schemas import DesignOutput
from app.services.calculations import boq, timeline
from app.services.design import (
    building_generator,
    flyover_generator,
    pipeline_generator,
    road_generator,
)
from app.services.exports.gltf_export import generate_glb
from app.services.storage import save_file

logger = logging.getLogger(__name__)

GENERATORS = {
    "flyover": flyover_generator.generate,
    "building": building_generator.generate,
    "pipeline": pipeline_generator.generate,
    "road": road_generator.generate,
}


def _site_context(db: Session, project: Project) -> dict | None:
    analysis = (
        db.query(SiteAnalysis)
        .filter(SiteAnalysis.project_id == project.id)
        .order_by(SiteAnalysis.created_at.desc())
        .first()
    )
    if analysis is None:
        return None
    return {
        "area_sqm": analysis.area_sqm,
        "perimeter_m": analysis.perimeter_m,
        "elevation_min_m": analysis.elevation_min_m,
        "elevation_max_m": analysis.elevation_max_m,
        "slope_percent_estimate": analysis.slope_percent_estimate,
        "risks": analysis.risks_json,
    }


async def run_design_generation(db: Session, project: Project, scenario: DesignScenario) -> dict:
    params = scenario.input_parameters_json or {}
    project_type = project.project_type

    # 1. LLM structured design (with retry once on invalid schema)
    user_prompt = prompts.build_user_prompt(project_type, params, _site_context(db, project))
    design_raw, provider = await providers.generate_design_json(
        prompts.SYSTEM_PROMPT, user_prompt, project_type, params
    )
    try:
        design = DesignOutput.model_validate(design_raw).model_dump()
    except ValidationError:
        logger.warning("AI output failed schema validation, retrying with mock provider")
        design_raw = providers._mock_generate(project_type, params)
        design = DesignOutput.model_validate(design_raw).model_dump()
        provider = "mock-fallback"

    # 2. Safety guardrails (mandatory risks/assumptions/permissions)
    design = safety_guardrails.enforce(design)
    design["ai_provider"] = provider

    # 3. Deterministic generation: quantities + geometry
    result = GENERATORS[project_type](params, design)
    quantities = result["quantities"]
    boq_result = boq.build_boq(db, result["boq_inputs"])
    driver_name, driver_value = result["timeline_driver"]
    schedule = timeline.estimate_months(project_type, driver_value)

    design["calculated"] = {
        "quantities": quantities,
        "derived": result["derived"],
        "timeline": schedule,
        "cost_summary": boq_result["cost_summary"],
    }
    design["geometry_spec"] = result["geometry_spec"]

    # 4. 3D models -> GLB in object storage (main model + separate excavation
    # layer so the viewer can toggle it independently)
    spec = result["geometry_spec"]
    main_spec = {**spec, "objects": [o for o in spec["objects"] if o.get("layer") != "excavation"]}
    exc_spec = {**spec, "objects": [o for o in spec["objects"] if o.get("layer") == "excavation"]}
    prefix = f"projects/{project.id}/scenario_{scenario.id}"
    glb_url = save_file(f"{prefix}/model.glb", generate_glb(main_spec), "model/gltf-binary")
    excavation_glb_url = None
    if exc_spec["objects"]:
        excavation_glb_url = save_file(f"{prefix}/excavation.glb", generate_glb(exc_spec), "model/gltf-binary")

    # 5. Persist
    scenario.design_output_json = design
    scenario.assumptions_json = design["assumptions"]
    scenario.status = "completed"
    estimate = QuantityEstimate(
        design_scenario_id=scenario.id,
        **quantities,
        total_cost_estimate=boq_result["cost_summary"]["total_medium"],
        line_items_json=boq_result["line_items"],
    )
    db.add(estimate)
    db.add(GeneratedFile(
        project_id=project.id,
        design_scenario_id=scenario.id,
        file_type="glb",
        file_url=glb_url,
        metadata_json={"frame": "local_meters", "provider": provider},
    ))
    if excavation_glb_url:
        db.add(GeneratedFile(
            project_id=project.id,
            design_scenario_id=scenario.id,
            file_type="glb-excavation",
            file_url=excavation_glb_url,
            metadata_json={"frame": "local_meters"},
        ))
    project.status = "designed"
    db.commit()
    db.refresh(estimate)

    return {
        "scenario_id": scenario.id,
        "design": design,
        "quantities": quantities,
        "line_items": boq_result["line_items"],
        "cost_summary": boq_result["cost_summary"],
        "timeline": schedule,
        "glb_url": glb_url,
        "excavation_glb_url": excavation_glb_url,
    }
