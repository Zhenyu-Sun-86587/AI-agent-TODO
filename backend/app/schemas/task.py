from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskStatus(str, Enum):
    # 当前业务只区分待办和完成；新增状态需同步服务层过滤、统计和迁移约束。
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
    # PATCH/PUT 更新语义：未传字段不改；传 null 的字段由服务层决定是否清空。
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

    # from_attributes 兼容 ORM 实例，保持 service 返回模型对象时路由可直接序列化。
    model_config = ConfigDict(from_attributes=True)


class TaskStatusRead(BaseModel):
    id: int
    status: TaskStatus
    updated_at: datetime

    # 状态更新接口只暴露最小响应面，减少前端误依赖完整任务字段。
    model_config = ConfigDict(from_attributes=True)


class CategoryRead(BaseModel):
    name: str
    task_count: int
