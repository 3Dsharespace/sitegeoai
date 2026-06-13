"""Auth token endpoint for development / JWT clients."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.security import DEV_USER_ID, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenRequest(BaseModel):
    user_id: int = DEV_USER_ID


@router.post("/token")
def issue_token(payload: TokenRequest):
    """Issue a JWT for API clients. Production should use Clerk/NextAuth instead."""
    token = create_access_token(payload.user_id)
    return {"access_token": token, "token_type": "bearer", "user_id": payload.user_id}
