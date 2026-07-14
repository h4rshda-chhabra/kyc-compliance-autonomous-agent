from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Central application configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Continuous KYC Autonomous Auditor"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # CORS
    cors_allow_origins: list[str] = ["http://localhost:5173"]

    # Database
    database_url: str = "postgresql+psycopg2://kyc:kyc@localhost:5432/kyc_auditor"

    # Sanctions screening (pre-built lookup DB compiled from OFAC SDN + OpenSanctions)
    sanctions_db_path: str = str(_REPO_ROOT / "datasets" / "processed" / "sanctions_lookup.db")

    # Auth
    secret_key: str = "change-me-in-env"
    access_token_expire_minutes: int = 30

    # AI providers
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None

    # Scheduler
    scheduler_enabled: bool = True

    # Logging
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
