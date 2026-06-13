"""Arq worker definitions for production deployments.

Run with: arq app.workers.tasks.WorkerSettings
In dev (no Redis), the API process runs the same coroutines inline via
app.services.jobs, so the worker is optional.
"""

from arq.connections import RedisSettings

from app.core.config import settings
from app.db.models import DesignScenario, Project
from app.db.session import SessionLocal
from app.services import jobs
from app.services.ai.orchestrator import run_design_generation


async def generate_design_task(ctx, job_id: str, project_id: int, scenario_id: int) -> dict:
    db = SessionLocal()
    try:
        jobs.set_status(job_id, "running")
        project = db.get(Project, project_id)
        scenario = db.get(DesignScenario, scenario_id)
        result = await run_design_generation(db, project, scenario)
        jobs.set_status(job_id, "completed", result=result)
        return result
    except Exception as exc:
        jobs.set_status(job_id, "failed", error=str(exc))
        raise
    finally:
        db.close()


class WorkerSettings:
    functions = [generate_design_task]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
