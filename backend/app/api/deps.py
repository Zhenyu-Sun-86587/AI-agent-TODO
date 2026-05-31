from typing import Generator

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, ErrorCode
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    user_id = decode_access_token(token)
    if not user_id:
        raise BusinessError(ErrorCode.UNAUTHORIZED, "Invalid or expired token", status_code=401)

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise BusinessError(ErrorCode.UNAUTHORIZED, "Invalid or expired token", status_code=401)
    return user
