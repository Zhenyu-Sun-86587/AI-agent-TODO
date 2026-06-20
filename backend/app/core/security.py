import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    # 密码只保存 bcrypt 哈希，业务层不应接触明文持久化。
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    # JWT 的 sub 只存用户标识，权限和用户状态仍在请求时从数据库重新确认。
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[str]:
    try:
        # 解码失败统一返回 None，由依赖层转换为 UNAUTHORIZED，避免各路由重复处理。
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        return None
    subject = payload.get("sub")
    return str(subject) if subject is not None else None


def mask_secret(value: Optional[str]) -> Optional[str]:
    # 对外展示密钥时只返回掩码，避免设置页或日志泄漏完整凭据。
    if not value:
        return None
    if len(value) < 8:
        return "****"
    return f"{value[:3]}****{value[-4:]}"


def _fernet() -> Fernet:
    # Fernet 需要 32 字节 urlsafe base64 key；这里从配置密钥派生，便于环境变量管理。
    digest = hashlib.sha256(settings.api_key_encryption_secret.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: str) -> str:
    return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
