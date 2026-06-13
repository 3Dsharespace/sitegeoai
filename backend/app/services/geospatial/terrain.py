"""Terrain / elevation adapter.

Uses the free Open-Elevation API when reachable; otherwise returns a flat
mock terrain clearly marked as assumed.
"""

import logging

import httpx

logger = logging.getLogger(__name__)

OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"


async def sample_elevations(points: list[tuple[float, float]]) -> dict:
    """points: list of (lat, lng). Returns elevations + provenance flag."""
    try:
        locations = [{"latitude": lat, "longitude": lng} for lat, lng in points]
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(OPEN_ELEVATION_URL, json={"locations": locations})
            resp.raise_for_status()
            results = resp.json()["results"]
        elevations = [r["elevation"] for r in results]
        return {"elevations_m": elevations, "provider": "open-elevation", "assumed": False}
    except Exception:
        logger.warning("Elevation API unavailable, assuming flat terrain at 100m")
        return {"elevations_m": [100.0] * len(points), "provider": "mock-flat", "assumed": True}
