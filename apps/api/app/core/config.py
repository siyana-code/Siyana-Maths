from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    app_env: Literal["development", "test", "staging", "production"] = "development"
    api_version: str = "0.1.0"
    api_prefix: str = "/api/v1"

    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_timeout_seconds: float = Field(default=5.0, gt=0, le=30)

    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origins(self) -> list[str]:
        """Return explicitly allowed browser origins without wildcard defaults."""
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip() and origin.strip() != "*"
        ]

    @property
    def supabase_configured(self) -> bool:
        """Whether public Supabase REST integration can be used."""
        return bool(self.supabase_url and self.supabase_anon_key)

    @property
    def supabase_write_configured(self) -> bool:
        """Whether privileged Supabase writes can be used."""
        return bool(self.supabase_url and self.supabase_service_role_key)

    def missing_public_supabase_settings(self) -> list[str]:
        missing: list[str] = []
        if not self.supabase_url:
            missing.append("SUPABASE_URL")
        if not self.supabase_anon_key:
            missing.append("SUPABASE_ANON_KEY")
        return missing


@lru_cache
def get_settings() -> Settings:
    return Settings()
