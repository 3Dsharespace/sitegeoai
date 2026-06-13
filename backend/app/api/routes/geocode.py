from fastapi import APIRouter, Query

from app.services.geospatial.geocoding import geocode
from app.services.geospatial.tiles import get_map_runtime_config, get_tile_providers

router = APIRouter(prefix="/api/geocode", tags=["geospatial"])


@router.get("")
async def search(q: str = Query(min_length=2, max_length=200)):
    return {"results": await geocode(q)}


@router.get("/tile-providers")
def tile_providers():
    return get_tile_providers()


@router.get("/map-runtime-config")
def map_runtime_config():
    """Secrets for map/3D client bootstrap. Keys are set server-side in .env only."""
    return get_map_runtime_config()
