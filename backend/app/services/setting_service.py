from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BusinessError, ErrorCode
from app.core.security import decrypt_secret, encrypt_secret, mask_secret
from app.models.user import User
from app.models.user_setting import UserSetting


class SettingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create(self, user: User) -> UserSetting:
        if user.setting:
            return user.setting
        setting = UserSetting(user_id=user.id, model_name=settings.openai_default_model)
        self.db.add(setting)
        self.db.commit()
        self.db.refresh(setting)
        return setting

    def update(
        self,
        user: User,
        openai_api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        openai_key_provided: bool = False,
    ) -> UserSetting:
        setting = self.get_or_create(user)
        if openai_key_provided:
            setting.openai_api_key_encrypted = (
                encrypt_secret(openai_api_key) if openai_api_key else None
            )
        if model_name:
            setting.model_name = model_name
        self.db.add(setting)
        self.db.commit()
        self.db.refresh(setting)
        return setting

    def to_read(self, setting: UserSetting) -> dict:
        api_key = self._decrypt_optional(setting.openai_api_key_encrypted)
        configured_api_key = api_key or settings.openai_api_key
        return {
            "openai_api_key_masked": mask_secret(configured_api_key),
            "has_openai_api_key": bool(configured_api_key),
            "model_name": setting.model_name,
            "created_at": setting.created_at,
            "updated_at": setting.updated_at,
        }

    def get_model_name(self, user: User) -> str:
        return self.get_or_create(user).model_name or settings.openai_default_model

    def get_openai_api_key(self, user: User) -> Optional[str]:
        setting = self.get_or_create(user)
        return self._decrypt_optional(setting.openai_api_key_encrypted) or settings.openai_api_key

    def require_openai_api_key(self, user: User) -> str:
        api_key = self.get_openai_api_key(user)
        if not api_key:
            raise BusinessError(
                ErrorCode.OPENAI_KEY_MISSING,
                "用户未配置 OpenAI API Key",
                status_code=400,
            )
        return api_key

    def _decrypt_optional(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        return decrypt_secret(value)
