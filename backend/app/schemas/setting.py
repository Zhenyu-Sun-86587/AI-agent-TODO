from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserSettingRead(BaseModel):
    openai_api_key_masked: Optional[str] = None
    has_openai_api_key: bool
    model_name: str
    created_at: datetime
    updated_at: datetime


class UserSettingUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    model_name: Optional[str] = Field(default=None, max_length=100)


class OpenAIKeyTestRequest(BaseModel):
    openai_api_key: Optional[str] = None
    model_name: Optional[str] = Field(default=None, max_length=100)


class OpenAIKeyTestResponse(BaseModel):
    valid: bool
    model_name: Optional[str] = None
    latency_ms: Optional[int] = None
