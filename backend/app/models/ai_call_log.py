from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.utils.datetime import utc_now


class AiCallLog(Base):
    __tablename__ = "ai_call_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    input_text = Column(Text, nullable=False)
    output_json = Column(JSON, nullable=True)
    status = Column(String(16), nullable=False, index=True)
    model_name = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    # AI 调用日志按用户隔离，用于排障、审计和“我的调用记录”分页查询。
    user = relationship("User", back_populates="ai_call_logs")
