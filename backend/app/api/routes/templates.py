from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.models import ProjectTemplate
from app.db.session import get_db

router = APIRouter(prefix="/api/admin/templates", tags=["admin"])


class TemplateIn(BaseModel):
    project_type: str
    name: str
    default_parameters_json: dict


def _out(t: ProjectTemplate) -> dict:
    return {"id": t.id, "project_type": t.project_type, "name": t.name,
            "default_parameters_json": t.default_parameters_json, "updated_at": t.updated_at}


@router.get("")
def list_templates(project_type: str | None = None, db: Session = Depends(get_db)):
    query = db.query(ProjectTemplate)
    if project_type:
        query = query.filter(ProjectTemplate.project_type == project_type)
    return [_out(t) for t in query.order_by(ProjectTemplate.project_type)]


@router.post("", status_code=201)
def create_template(payload: TemplateIn, db: Session = Depends(get_db)):
    template = ProjectTemplate(**payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return _out(template)


@router.put("/{template_id}")
def update_template(template_id: int, payload: TemplateIn, db: Session = Depends(get_db)):
    template = db.get(ProjectTemplate, template_id)
    if template is None:
        raise HTTPException(404, "Template not found")
    for key, value in payload.model_dump().items():
        setattr(template, key, value)
    db.commit()
    db.refresh(template)
    return _out(template)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.get(ProjectTemplate, template_id)
    if template is None:
        raise HTTPException(404, "Template not found")
    db.delete(template)
    db.commit()
