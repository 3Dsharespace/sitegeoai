"""AI assistant endpoint for the workspace chat panel."""

import json
import re

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.routes.projects import get_owned_project
from app.core.disclaimer import DISCLAIMER
from app.core.security import get_current_user_id
from app.db.models import DesignScenario
from app.db.session import get_db

router = APIRouter(prefix="/api/projects/{project_id}/ai", tags=["ai"])


class ChatMessage(BaseModel):
    message: str


def _latest_params(db: Session, project_id: int) -> dict:
    scenario = (
        db.query(DesignScenario)
        .filter(DesignScenario.project_id == project_id)
        .order_by(DesignScenario.created_at.desc())
        .first()
    )
    return dict(scenario.input_parameters_json or {}) if scenario else {}


def _build_chat_response(project_id: int, msg: str, db: Session) -> tuple[str, dict | None]:
    params = _latest_params(db, project_id)
    action = None
    lanes = re.search(r"(\d+)\s*lane", msg)
    length = re.search(r"(\d+(?:\.\d+)?)\s*(?:m|meter|metre)s?\b", msg)
    spacing = re.search(r"pier\s+spacing\s*(?:to|of)?\s*(\d+(?:\.\d+)?)", msg)
    floors = re.search(r"(\d+)\s*floor", msg)

    if lanes:
        params["lanes"] = int(lanes.group(1))
        params["deck_width_m"] = int(lanes.group(1)) * 3.5 + 2
        reply = f"Updated to {lanes.group(1)} lanes (deck width {params['deck_width_m']}m). Regenerate to apply."
        action = {"type": "update_parameters", "parameters": params}
    elif spacing:
        params["pier_spacing_m"] = float(spacing.group(1))
        reply = f"Pier spacing set to {spacing.group(1)}m. Regenerate to apply."
        action = {"type": "update_parameters", "parameters": params}
    elif floors:
        params["floors"] = int(floors.group(1))
        reply = f"Updated to {floors.group(1)} floors. Regenerate to apply."
        action = {"type": "update_parameters", "parameters": params}
    elif length and ("long" in msg or "length" in msg):
        params["length_m"] = float(length.group(1))
        reply = f"Length set to {length.group(1)}m. Regenerate to apply."
        action = {"type": "update_parameters", "parameters": params}
    elif "reduce cost" in msg or "cheaper" in msg:
        reply = (
            "Cost reduction options: reduce length/width, increase pier spacing "
            "(fewer piers), choose a lower concrete grade, or phase the project. "
            "Tell me a specific change (e.g. 'pier spacing to 35') and regenerate."
        )
    elif "excavation" in msg:
        reply = "Toggle the 'Excavation' layer in the layer panel to see the excavation volume in the 3D view."
        action = {"type": "show_layer", "layer": "excavation"}
    elif "report" in msg or "pdf" in msg:
        reply = "Generating the PDF report download for you."
        action = {"type": "download", "export": "pdf"}
    elif "regenerate" in msg or "generate" in msg:
        reply = "Starting design regeneration with current parameters."
        action = {"type": "regenerate", "parameters": params}
    else:
        reply = (
            "I can help adjust the design. Try: 'make this 4 lanes', "
            "'change pier spacing to 35', 'make it 600 m long', 'reduce cost', "
            "'show excavation', or 'generate report'."
        )
    return reply, action


@router.post("/chat")
def chat(
    project_id: int,
    payload: ChatMessage,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    get_owned_project(project_id, db, user_id)
    reply, action = _build_chat_response(project_id, payload.message.lower(), db)
    return {"reply": reply, "action": action, "disclaimer": DISCLAIMER}


@router.post("/chat/stream")
def chat_stream(
    project_id: int,
    payload: ChatMessage,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    get_owned_project(project_id, db, user_id)
    reply, action = _build_chat_response(project_id, payload.message.lower(), db)

    def generate():
        chunk_size = max(8, len(reply) // 12)
        for i in range(0, len(reply), chunk_size):
            part = reply[i : i + chunk_size]
            yield f"data: {json.dumps({'chunk': part})}\n\n"
        yield f"data: {json.dumps({'done': True, 'action': action, 'disclaimer': DISCLAIMER})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
