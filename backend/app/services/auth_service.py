from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BusinessError, ErrorCode
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.models.user_setting import UserSetting
from app.schemas.auth import LoginRequest
from app.schemas.user import UserCreate


class AuthService:
    DEMO_USERNAME = "demo_user"
    DEMO_EMAIL = "demo@aitodo.dev"
    DEMO_PASSWORD = "aitodo-demo-account"

    def __init__(self, db: Session) -> None:
        self.db = db

    def register(self, payload: UserCreate) -> dict:
        existing_user = (
            self.db.query(User)
            .filter(or_(User.username == payload.username, User.email == payload.email))
            .first()
        )
        if existing_user:
            raise BusinessError(
                ErrorCode.USER_EXISTS,
                "用户名或邮箱已存在",
                status_code=409,
            )

        user = User(
            username=payload.username,
            email=str(payload.email),
            password_hash=hash_password(payload.password),
        )
        self.db.add(user)
        self.db.flush()
        self.db.add(UserSetting(user_id=user.id, model_name=settings.openai_default_model))
        self.db.commit()
        self.db.refresh(user)
        return self._auth_payload(user)

    def login(self, payload: LoginRequest) -> dict:
        user = (
            self.db.query(User)
            .filter(or_(User.username == payload.account, User.email == payload.account))
            .first()
        )
        if not user or not verify_password(payload.password, user.password_hash):
            raise BusinessError(
                ErrorCode.LOGIN_FAILED,
                "用户名、邮箱或密码错误",
                status_code=401,
            )
        return self._auth_payload(user)

    def demo_login(self) -> dict:
        user = self.db.query(User).filter(User.email == self.DEMO_EMAIL).first()
        if not user:
            user = User(
                username=self.DEMO_USERNAME,
                email=self.DEMO_EMAIL,
                password_hash=hash_password(self.DEMO_PASSWORD),
            )
            self.db.add(user)
            self.db.flush()

        if not user.setting:
            self.db.add(UserSetting(user_id=user.id, model_name=settings.openai_default_model))

        self.db.commit()
        self.db.refresh(user)
        return self._auth_payload(user)

    def _auth_payload(self, user: User) -> dict:
        return {
            "user": user,
            "access_token": create_access_token(str(user.id)),
            "token_type": "bearer",
            "expires_in": settings.access_token_expire_minutes * 60,
        }
