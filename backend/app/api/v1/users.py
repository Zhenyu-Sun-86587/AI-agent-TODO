from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.response import success_response
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me")
def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    # /me 只返回当前 token 对应用户，避免通过路径参数探测其他用户资料。
    return success_response(
        UserRead.model_validate(current_user),
        request_id=request.state.request_id,
    )


@router.put("/me")
def update_me(
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # 用户资料更新复用 current_user 作为写入边界，唯一性和持久化由服务层处理。
    user = UserService(db).update_me(current_user, payload)
    return success_response(UserRead.model_validate(user), request_id=request.state.request_id)
