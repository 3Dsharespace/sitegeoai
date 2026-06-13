from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.disclaimer import DISCLAIMER
from app.core.logging import setup_logging
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_db()
    yield


app = FastAPI(
    title="GeoAI 3D Construction Planner API",
    description=f"Preliminary construction planning API. {DISCLAIMER}",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local-filesystem storage fallback is served at /files
Path(settings.LOCAL_STORAGE_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=settings.LOCAL_STORAGE_DIR), name="files")


@app.get("/health")
def health():
    return {"status": "ok", "disclaimer": DISCLAIMER}


from app.api.routes import (  # noqa: E402
    ai,
    auth,
    design_generate,
    estimates,
    exports,
    geocode,
    jobs,
    projects,
    rates,
    site_analysis,
    site_suggestions,
    survey,
    templates,
    tiles,
)

app.include_router(projects.router)
app.include_router(survey.router)
app.include_router(auth.router)
app.include_router(geocode.router)
app.include_router(tiles.router)
app.include_router(site_analysis.router)
app.include_router(site_suggestions.router)
app.include_router(design_generate.router)
app.include_router(jobs.router)
app.include_router(estimates.router)
app.include_router(exports.router)
app.include_router(rates.router)
app.include_router(templates.router)
app.include_router(ai.router)
