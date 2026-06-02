from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, ErrorCode
from app.models.user import User
from app.schemas.user import UserUpdate


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def update_me(self, user: User, payload: UserUpdate) -> User:
        fields_set = getattr(payload, "model_fields_set", set())
        username = payload.username if "username" in fields_set else None
        email = str(payload.email) if "email" in fields_set and payload.email is not None else None

        if username or email:
            filters = []
            if username:
                filters.append(User.username == username)
            if email:
                filters.append(User.email == email)
            existing_user = (
                self.db.query(User)
                .filter(or_(*filters), User.id != user.id)
                .first()
            )
            if existing_user:
                raise BusinessError(
                    ErrorCode.USER_EXISTS,
                    "用户名或邮箱已存在",
                    status_code=409,
                )

        if "username" in fields_set and payload.username is not None:
            user.username = payload.username
        if "email" in fields_set and payload.email is not None:
            user.email = str(payload.email)

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
