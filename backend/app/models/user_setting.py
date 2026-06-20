from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.config import settings
from app.db.base_class import Base
from app.utils.datetime import utc_now


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    openai_api_key_encrypted = Column(Text, nullable=True)
    model_name = Column(String(100), nullable=False, default=settings.openai_default_model)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # 每个用户最多一份设置，保存加密后的 API key 和当前默认模型。
    user = relationship("User", back_populates="setting")
