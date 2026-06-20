from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置约定：默认值服务本地开发，部署环境通过 .env 或环境变量覆盖。"""

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

    openai_api_key: Optional[str] = None
    openai_default_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_resolve_with_doh: bool = True
    deepseek_doh_url: str = "https://cloudflare-dns.com/dns-query"
    deepseek_force_resolve_ip: Optional[str] = None
    ai_mock_mode: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origins(self) -> List[str]:
        # 环境变量用逗号分隔多个来源，读取时去空白并过滤空项，避免 CORS 配置出现空字符串。
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    # Settings 读取环境变量有一定成本且应保持进程内一致，因此用缓存作为单例配置入口。
    return Settings()


settings = get_settings()
