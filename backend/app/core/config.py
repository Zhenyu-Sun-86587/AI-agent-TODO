from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI-agent-TODO"
    app_env: str = "development"
    debug: bool = True

    api_prefix: str = "/api"
    backend_cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    database_url: str = "sqlite:///./ai_agent_todo.db"

    jwt_secret_key: str = "please-change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    api_key_encryption_secret: str = "please-change-this-secret"

    openai_default_model: str = "gpt-4o-mini"
    ai_mock_mode: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origins(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
