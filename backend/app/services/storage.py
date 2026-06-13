"""File storage: S3/MinIO when configured+reachable, else local filesystem.

Local files are served by the backend at /files/{path}.
"""

import logging
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

_s3_client = None
_s3_checked = False


def _get_s3():
    global _s3_client, _s3_checked
    if _s3_checked:
        return _s3_client
    _s3_checked = True
    if not (settings.S3_ENDPOINT and settings.S3_ACCESS_KEY):
        return None
    try:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
        )
        existing = [b["Name"] for b in client.list_buckets().get("Buckets", [])]
        if settings.S3_BUCKET not in existing:
            client.create_bucket(Bucket=settings.S3_BUCKET)
        _s3_client = client
        logger.info("Using S3 storage at %s", settings.S3_ENDPOINT)
    except Exception:
        logger.warning("S3/MinIO unreachable; using local filesystem storage")
        _s3_client = None
    return _s3_client


def save_file(key: str, data: bytes, content_type: str) -> str:
    """Returns a URL the frontend can download from."""
    s3 = _get_s3()
    if s3 is not None:
        s3.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=data, ContentType=content_type)
        return s3.generate_presigned_url(
            "get_object", Params={"Bucket": settings.S3_BUCKET, "Key": key}, ExpiresIn=7 * 24 * 3600
        )
    path = Path(settings.LOCAL_STORAGE_DIR) / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return f"http://localhost:8000/files/{key}"
