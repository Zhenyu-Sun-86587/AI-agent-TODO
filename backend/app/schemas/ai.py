from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.task import Priority, TaskRead


class ParseTaskRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    # timezone 由客户端显式传入，AI 解析相对日期时不能假设服务器所在时区。
    timezone: str = "Asia/Shanghai"


class AiParsedTask(BaseModel):
    # AI 解析结果允许缺省字段，最终建任务前会与用户覆盖值合并并再次校验。
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.medium
    category: Optional[str] = None
    due_time: Optional[datetime] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    raw_due_text: Optional[str] = None


class AiTaskOverrides(BaseModel):
    # overrides 用于用户确认 AI 草稿时微调字段，字段规则与普通任务保持兼容。
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


class AiChatAttachment(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    size: int = Field(default=0, ge=0)
    type: str = Field(default="", max_length=100)
    content: str = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def _validate_markdown_name(cls, value: str) -> str:
        if not value.lower().endswith(".md"):
            raise ValueError("只支持 .md 附件")
        return value


class AiChatMessage(BaseModel):
    # role 限定为常见聊天角色，避免任意字符串透传给模型提供商。
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str = Field(default="", max_length=4000)
    attachments: list[AiChatAttachment] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def _validate_payload(self):
        if not self.content.strip() and not self.attachments:
            raise ValueError("消息内容和附件不能同时为空")
        return self


class AiChatRequest(BaseModel):
    # agent_mode/follow_up_mode 是服务层行为开关，schema 只负责稳定接收旧客户端字段。
    model_name: Optional[str] = Field(default=None, max_length=100)
    messages: list[AiChatMessage] = Field(min_length=1, max_length=30)
    agent_mode: bool = False
    follow_up_mode: bool = False
    timezone: str = "Asia/Shanghai"


class AiChatResponse(BaseModel):
    content: str
    model_name: str
    agent_action: Optional[str] = None
    task_changed: bool = False
    task: Optional[TaskRead] = None


class AiLogRead(BaseModel):
    id: int
    input_text: str
    output_json: Optional[Any] = None
    status: str
    model_name: Optional[str] = None
    created_at: datetime

    # 调用日志直接从 ORM 读取，output_json 保持 Any 以兼容不同 AI 返回结构。
    model_config = ConfigDict(from_attributes=True)
