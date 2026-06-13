from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.disclaimer import DISCLAIMER
from app.core.security import get_current_user_id
from app.db.models import Project
from app.db.session import IS_POSTGRES, get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])

PROJECT_TYPES = {"flyover", "building", "pipeline", "road"}


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    project_type: str
    units: str = "metric"
    location_name: str = ""
    center_lat: float | None = Field(default=None, ge=-90, le=90)
    center_lng: float | None = Field(default=None, ge=-180, le=180)
    boundary_geojson: dict[str, Any] | None = None
    alignment_geojson: dict[str, Any] | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    units: str | None = None
    location_name: str | None = None
    center_lat: float | None = Field(default=None, ge=-90, le=90)
    center_lng: float | None = Field(default=None, ge=-180, le=180)
    boundary_geojson: dict[str, Any] | None = None
    alignment_geojson: dict[str, Any] | None = None


class ProjectOut(BaseModel):
    id: int
    name: str
    project_type: str
    status: str
    units: str
    location_name: str
    center_lat: float | None
    center_lng: float | None
    boundary_geojson: dict[str, Any] | None
    alignment_geojson: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    disclaimer: str = DISCLAIMER

    model_config = {"from_attributes": True}


def _validate_geojson(geojson: dict | None, expected: set[str]) -> None:
    if geojson is not None and geojson.get("type") not in expected:
        raise HTTPException(422, f"Expected GeoJSON geometry of type {expected}, got {geojson.get('type')}")


def _sync_postgis_geometry(db: Session, project: Project) -> None:
    """Keep the PostGIS geometry column in sync with the GeoJSON boundary."""
    if not IS_POSTGRES or project.boundary_geojson is None:
        return
    import json

    db.execute(
        text("UPDATE projects SET boundary_geom = ST_SetSRID(ST_GeomFromGeoJSON(:gj), 4326) WHERE id = :id"),
        {"gj": json.dumps(project.boundary_geojson), "id": project.id},
    )


def get_owned_project(project_id: int, db: Session, user_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.user_id != user_id:
        raise HTTPException(404, "Project not found")
    return project


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if payload.project_type not in PROJECT_TYPES:
        raise HTTPException(422, f"project_type must be one of {sorted(PROJECT_TYPES)}")
    _validate_geojson(payload.boundary_geojson, {"Polygon"})
    _validate_geojson(payload.alignment_geojson, {"LineString"})

    project = Project(user_id=user_id, **payload.model_dump())
    db.add(project)
    db.flush()
    _sync_postgis_geometry(db, project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return (
        db.query(Project)
        .filter(Project.user_id == user_id)
        .order_by(Project.updated_at.desc())
        .all()
    )


@router.get("/summaries")
def project_summaries(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Batch health flags for dashboard — avoids N+1 per-project fetches."""
    from app.db.models import DesignScenario, QuantityEstimate, SiteAnalysis

    projects = (
        db.query(Project)
        .filter(Project.user_id == user_id)
        .order_by(Project.updated_at.desc())
        .all()
    )
    if not projects:
        return []

    ids = [p.id for p in projects]
    scenario_rows = (
        db.query(DesignScenario)
        .filter(DesignScenario.project_id.in_(ids))
        .order_by(DesignScenario.created_at.desc())
        .all()
    )
    scenarios_by_project: dict[int, list] = {}
    for s in scenario_rows:
        scenarios_by_project.setdefault(s.project_id, []).append(s)

    estimate_project_ids = {
        row[0]
        for row in db.query(DesignScenario.project_id)
        .join(QuantityEstimate, QuantityEstimate.design_scenario_id == DesignScenario.id)
        .filter(DesignScenario.project_id.in_(ids))
        .distinct()
        .all()
    }
    analysis_project_ids = {
        row[0]
        for row in db.query(SiteAnalysis.project_id)
        .filter(SiteAnalysis.project_id.in_(ids))
        .distinct()
        .all()
    }

    out = []
    for p in projects:
        sc = scenarios_by_project.get(p.id, [])
        completed = [s for s in sc if s.status == "completed"]
        latest = completed[0] if completed else (sc[0] if sc else None)
        has_design = p.status == "designed" or bool(completed)
        has_params = bool(latest and latest.input_parameters_json)
        out.append(
            {
                "project_id": p.id,
                "has_location": bool(p.location_name or p.center_lat is not None),
                "has_boundary": bool(p.boundary_geojson),
                "has_analysis": p.id in analysis_project_ids,
                "has_parameters": has_params,
                "has_design": has_design,
                "has_estimate": p.id in estimate_project_ids,
                "scenario_count": len(sc),
                "progress": round(
                    sum(
                        [
                            bool(p.location_name or p.center_lat is not None),
                            bool(p.boundary_geojson),
                            p.id in analysis_project_ids,
                            has_params,
                            has_design,
                            p.id in estimate_project_ids,
                        ]
                    )
                    / 6
                    * 100
                ),
            }
        )
    return out


@router.get("/demo", response_model=ProjectOut)
def get_demo_project(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Return the seeded Bengaluru demo project (creates it if missing)."""
    from app.db.demo_seed import ensure_demo_project

    project = ensure_demo_project(db)
    if project is None:
        raise HTTPException(404, "Demo project not available")
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return get_owned_project(project_id, db, user_id)


@router.get("/{project_id}/validation")
def get_project_validation(
    project_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Readiness checks before design generation, BOQ, and exports."""
    from app.services.project_validation import validate_project

    project = get_owned_project(project_id, db, user_id)
    return validate_project(db, project)


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    project = get_owned_project(project_id, db, user_id)
    _validate_geojson(payload.boundary_geojson, {"Polygon"})
    _validate_geojson(payload.alignment_geojson, {"LineString"})
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    _sync_postgis_geometry(db, project)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    project = get_owned_project(project_id, db, user_id)
    db.delete(project)
    db.commit()
