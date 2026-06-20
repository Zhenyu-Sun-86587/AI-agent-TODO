from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.utils.datetime import utc_now


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(32), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # 删除用户时级联清理其任务、设置和 AI 调用记录，避免残留跨用户数据。
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    # 用户设置是一对一关系，uselist=False 与 user_settings.user_id 的唯一索引保持一致。
    setting = relationship(
        "UserSetting",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    ai_call_logs = relationship("AiCallLog", back_populates="user", cascade="all, delete-orphan")
