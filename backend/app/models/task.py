from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.utils.datetime import utc_now


class Task(Base):
    __tablename__ = "tasks"
    # 任务列表按当前用户过滤后常按状态、优先级、分类、截止时间和创建时间检索。
    __table_args__ = (
        Index("idx_tasks_user_status", "user_id", "status"),
        Index("idx_tasks_user_priority", "user_id", "priority"),
        Index("idx_tasks_user_category", "user_id", "category"),
        Index("idx_tasks_user_due_time", "user_id", "due_time"),
        Index("idx_tasks_user_created_at", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(16), nullable=False, default="medium", index=True)
    category = Column(String(50), nullable=True, index=True)
    due_time = Column(DateTime(timezone=True), nullable=True, index=True)
    status = Column(String(16), nullable=False, default="todo", index=True)
    is_ai_created = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # 所有任务必须归属用户，服务层查询也以 current_user 为边界防止越权访问。
    user = relationship("User", back_populates="tasks")
