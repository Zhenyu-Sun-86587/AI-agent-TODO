from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserSettingRead(BaseModel):
    # 返回掩码和布尔值，不返回真实 API key，前端据此展示“已配置”状态。
    openai_api_key_masked: Optional[str] = None
    has_openai_api_key: bool
    model_name: str
    created_at: datetime
    updated_at: datetime


class UserSettingUpdate(BaseModel):
    # openai_api_key 缺省表示不改；显式传空值由服务层解释为清除密钥。
    openai_api_key: Optional[str] = None
    model_name: Optional[str] = Field(default=None, max_length=100)


class OpenAIKeyTestRequest(BaseModel):
    openai_api_key: Optional[str] = None
    model_name: Optional[str] = Field(default=None, max_length=100)


class OpenAIKeyTestResponse(BaseModel):
    valid: bool
    model_name: Optional[str] = None
    latency_ms: Optional[int] = None
