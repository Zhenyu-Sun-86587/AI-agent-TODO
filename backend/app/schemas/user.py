from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    # 更新接口允许部分字段提交，None 表示该字段不参与修改。
    username: Optional[str] = Field(default=None, min_length=3, max_length=32)
    email: Optional[EmailStr] = None


class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime

    # 读取模型直接接收 SQLAlchemy 对象，避免路由层手动拆字段。
    model_config = ConfigDict(from_attributes=True)
