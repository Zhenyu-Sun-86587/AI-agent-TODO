from typing import Generator

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, ErrorCode
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User

# OAuth2PasswordBearer 只负责从 Authorization 头提取 bearer token；
# 真正的 JWT 校验和用户加载统一收口在 get_current_user。
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_db() -> Generator[Session, None, None]:
    """为每个请求提供独立数据库会话，请求结束后无论成功失败都关闭连接。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    # 鉴权边界：路由只依赖 current_user，不直接信任客户端传入的 user_id。
    user_id = decode_access_token(token)
    if not user_id:
        raise BusinessError(ErrorCode.UNAUTHORIZED, "Invalid or expired token", status_code=401)

    # token 通过校验后仍需确认用户存在，避免已删除账号继续访问受保护资源。
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise BusinessError(ErrorCode.UNAUTHORIZED, "Invalid or expired token", status_code=401)
    return user
