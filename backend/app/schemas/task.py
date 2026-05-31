from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskStatus(str, Enum):
    todo = "todo"
    done = "done"


class AiStatus(str, Enum):
    success = "success"
    failed = "failed"
    mocked = "mocked"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: Priority = Priority.medium
    category: Optional[str] = Field(default=None, max_length=50)
    due_time: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: Optional[Priority] = None
    category: Optional[str] = Field(default=None, max_length=50)
    due_time: Optional[datetime] = None
    status: Optional[TaskStatus] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    priority: Priority
    category: Optional[str] = None
    due_time: Optional[datetime] = None
    status: TaskStatus
    is_ai_created: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskStatusRead(BaseModel):
    id: int
    status: TaskStatus
    updated_at: datetime


class CategoryRead(BaseModel):
    name: str
    task_count: int
