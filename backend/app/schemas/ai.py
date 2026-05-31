from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.schemas.task import Priority, TaskCreate


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


class CreateTaskByAiRequest(ParseTaskRequest):
    overrides: Optional[TaskCreate] = None


class AiSuggestRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)


class AiSuggestResponse(BaseModel):
    priority: Priority
    category: Optional[str] = None
    reason: Optional[str] = None


class AiLogRead(BaseModel):
    id: int
    input_text: str
    output_json: Optional[Any] = None
    status: str
    model_name: Optional[str] = None
    created_at: datetime
