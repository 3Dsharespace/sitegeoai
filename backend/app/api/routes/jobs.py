from fastapi import APIRouter, HTTPException

from app.services import jobs

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/{job_id}")
def job_status(job_id: str):
    status = jobs.get_status(job_id)
    if status is None:
        raise HTTPException(404, "Job not found")
    return status
