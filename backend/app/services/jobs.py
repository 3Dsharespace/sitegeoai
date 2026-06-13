"""Job status store + background execution.

Status lives in Redis when available (shared with Arq workers), otherwise in
an in-process dict (single-process dev fallback). Jobs are executed as
asyncio tasks inside the API process in dev; production can run the same
coroutines via Arq (see app/workers/tasks.py).
"""

import asyncio
import json
import logging
import uuid
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_memory_store: dict[str, dict] = {}
_redis = None
_redis_checked = False


def _get_redis():
    global _redis, _redis_checked
    if _redis_checked:
        return _redis
    _redis_checked = True
    try:
        import redis

        client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        client.ping()
        _redis = client
        logger.info("Job store: Redis")
    except Exception:
        logger.warning("Redis unavailable; job store is in-memory")
        _redis = None
    return _redis


def set_status(job_id: str, status: str, result: Any = None, error: str | None = None) -> None:
    payload = {"job_id": job_id, "status": status, "result": result, "error": error}
    r = _get_redis()
    if r is not None:
        r.setex(f"job:{job_id}", 24 * 3600, json.dumps(payload, default=str))
    else:
        _memory_store[job_id] = payload


def get_status(job_id: str) -> dict | None:
    r = _get_redis()
    if r is not None:
        raw = r.get(f"job:{job_id}")
        return json.loads(raw) if raw else None
    return _memory_store.get(job_id)


def submit(coro_factory) -> str:
    """Run an async job in the background; coro_factory(job_id) -> coroutine."""
    job_id = uuid.uuid4().hex
    set_status(job_id, "queued")

    async def _runner():
        set_status(job_id, "running")
        try:
            result = await coro_factory(job_id)
            set_status(job_id, "completed", result=result)
        except Exception as exc:
            logger.exception("Job %s failed", job_id)
            set_status(job_id, "failed", error=str(exc))

    asyncio.get_event_loop().create_task(_runner())
    return job_id
