from pydantic import BaseModel, Field

from app.schemas.user import UserRead


class LoginRequest(BaseModel):
    # account 兼容用户名或邮箱登录，具体识别逻辑放在 AuthService。
    account: str = Field(min_length=1)
    password: str = Field(min_length=1)


class AuthResponse(BaseModel):
    # token_type 固定为 bearer，对齐 OAuth2PasswordBearer 的 Authorization 头解析约定。
    user: UserRead
    access_token: str
    token_type: str = "bearer"
    expires_in: int
