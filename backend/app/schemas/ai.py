from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.task import Priority


class ParseTaskRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    timezone: str = "Asia/Shanghai"


class AiParsedTask(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.medium
    category: Optional[str] = None
    due_time: Optional[datetime] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    raw_due_text: Optional[str] = None


class AiTaskOverrides(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: Optional[Priority] = None
    category: Optional[str] = Field(default=None, max_length=50)
    due_time: Optional[datetime] = None


class CreateTaskByAiRequest(ParseTaskRequest):
    overrides: Optional[AiTaskOverrides] = None


class AiSuggestRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)


class AiSuggestResponse(BaseModel):
    priority: Priority
    category: Optional[str] = None
    reason: Optional[str] = None


class AiChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str = Field(min_length=1, max_length=4000)


class AiChatRequest(BaseModel):
    model_name: Optional[str] = Field(default=None, max_length=100)
    messages: list[AiChatMessage] = Field(min_length=1, max_length=30)


class AiChatResponse(BaseModel):
    content: str
    model_name: str


class AiLogRead(BaseModel):
    id: int
    input_text: str
    output_json: Optional[Any] = None
    status: str
    model_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
