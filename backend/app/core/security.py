"""Auth — mock dev user with optional JWT bearer tokens."""

import logging
from typing import Any

from fastapi import Header, HTTPException
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

DEV_USER_ID = 1
ALGORITHM = "HS256"


def create_access_token(user_id: int, extra: dict[str, Any] | None = None) -> str:
    payload = {"sub": str(user_id), **(extra or {})}
    return jwt.encode(payload, settings.APP_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.APP_SECRET, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(401, "Invalid token")
        return int(sub)
    except (JWTError, ValueError) as e:
        raise HTTPException(401, "Invalid or expired token") from e


def get_current_user_id(
    authorization: str | None = Header(default=None),
    x_mock_user_id: int | None = Header(default=None),
) -> int:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        return decode_token(token)
    if settings.AUTH_REQUIRE_JWT:
        raise HTTPException(401, "Authorization required")
    return x_mock_user_id if x_mock_user_id is not None else DEV_USER_ID
