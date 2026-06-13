"""System / infrastructure status for admin and settings UI."""

from fastapi import APIRouter

from app.core.config import settings
from app.core.disclaimer import DISCLAIMER
from app.db.session import IS_POSTGRES
from app.services import jobs, storage

router = APIRouter(prefix="/api/system", tags=["system"])


def _redis_available() -> bool:
    return jobs._get_redis() is not None


def _storage_mode() -> str:
    return "s3" if storage._get_s3() is not None else "local"


def _ai_provider_status() -> dict:
    if settings.OPENAI_API_KEY:
        active = "openai"
    elif settings.ANTHROPIC_API_KEY:
        active = "anthropic"
    elif settings.GEMINI_API_KEY:
        active = "gemini"
    else:
        active = "mock"
    return {
        "active_provider": active,
        "mock_mode": active == "mock",
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
        "gemini_configured": bool(settings.GEMINI_API_KEY),
    }


def _map_provider_status() -> dict:
    return {
        "google_maps_configured": bool(settings.GOOGLE_MAPS_API_KEY),
        "mapbox_configured": bool(settings.MAPBOX_TOKEN),
        "cesium_ion_configured": bool(settings.CESIUM_ION_TOKEN),
        "osm_fallback": True,
    }


@router.get("/status")
def system_status():
    postgis = IS_POSTGRES
    return {
        "database_type": "postgresql" if postgis else "sqlite",
        "postgis_available": postgis,
        "database_mode_label": "Full survey mode (PostGIS)" if postgis else "Limited GIS mode (SQLite)",
        "redis_available": _redis_available(),
        "job_store": "redis" if _redis_available() else "in_memory",
        "storage_mode": _storage_mode(),
        "survey_mode_available": postgis,
        "ai": _ai_provider_status(),
        "maps": _map_provider_status(),
        "disclaimer": DISCLAIMER,
    }
