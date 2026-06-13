from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+psycopg2://geoai:geoai@localhost:5432/geoai"
    REDIS_URL: str = "redis://localhost:6379/0"

    S3_ENDPOINT: str = ""
    S3_BUCKET: str = "geoai-files"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""

    GOOGLE_MAPS_API_KEY: str = ""
    CESIUM_ION_TOKEN: str = ""
    MAPBOX_TOKEN: str = ""

    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    APP_SECRET: str = "dev-secret-change-me"
    AUTH_REQUIRE_JWT: bool = False
    ENVIRONMENT: str = "development"
    NEXT_PUBLIC_APP_URL: str = "http://localhost:3000"

    LOCAL_STORAGE_DIR: str = str(BACKEND_DIR / "storage")


settings = Settings()
