from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.routes.projects import get_owned_project
from app.core.security import get_current_user_id
from app.db.models import DesignScenario, Project
from app.db.session import SessionLocal, get_db
from app.services import jobs
from app.services.ai.orchestrator import run_design_generation

router = APIRouter(prefix="/api/projects/{project_id}", tags=["design"])


class GenerateRequest(BaseModel):
    scenario_name: str = "Scenario 1"
    parameters: dict[str, Any] = {}


@router.post("/design/generate")
async def generate_design(
    project_id: int,
    payload: GenerateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    project = get_owned_project(project_id, db, user_id)
    scenario = DesignScenario(
        project_id=project.id,
        name=payload.scenario_name,
        input_parameters_json=payload.parameters,
        status="running",
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    scenario_id = scenario.id

    async def _job(job_id: str):
        job_db = SessionLocal()
        try:
            job_project = job_db.get(Project, project_id)
            job_scenario = job_db.get(DesignScenario, scenario_id)
            return await run_design_generation(job_db, job_project, job_scenario)
        except Exception:
            job_db.rollback()
            job_scenario = job_db.get(DesignScenario, scenario_id)
            if job_scenario is not None:
                job_scenario.status = "failed"
                job_db.commit()
            raise
        finally:
            job_db.close()

    job_id = jobs.submit(_job)
    return {"job_id": job_id, "scenario_id": scenario_id, "status": "queued"}


@router.get("/scenarios")
def list_scenarios(
    project_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    get_owned_project(project_id, db, user_id)
    scenarios = (
        db.query(DesignScenario)
        .filter(DesignScenario.project_id == project_id)
        .order_by(DesignScenario.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "name": s.name,
            "status": s.status,
            "input_parameters_json": s.input_parameters_json,
            "design_output_json": s.design_output_json,
            "assumptions_json": s.assumptions_json,
            "created_at": s.created_at,
        }
        for s in scenarios
    ]


@router.put("/scenarios/{scenario_id}/assumptions")
def update_assumptions(
    project_id: int,
    scenario_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    get_owned_project(project_id, db, user_id)
    scenario = db.get(DesignScenario, scenario_id)
    if scenario is None or scenario.project_id != project_id:
        raise HTTPException(404, "Scenario not found")
    assumptions = payload.get("assumptions")
    if not isinstance(assumptions, list):
        raise HTTPException(422, "Body must contain 'assumptions' list")
    scenario.assumptions_json = assumptions
    if scenario.design_output_json:
        design = dict(scenario.design_output_json)
        design["assumptions"] = assumptions
        scenario.design_output_json = design
    db.commit()
    return {"ok": True, "assumptions": assumptions}
