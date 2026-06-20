from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.response import success_response
from app.models.user import User
from app.schemas.auth import LoginRequest
from app.schemas.user import UserCreate, UserRead
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    # 路由层只负责依赖注入和响应包装，注册事务与唯一性校验交给 AuthService。
    data = AuthService(db).register(payload)
    data["user"] = UserRead.model_validate(data["user"])
    return success_response(data, request_id=request.state.request_id)


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    data = AuthService(db).login(payload)
    data["user"] = UserRead.model_validate(data["user"])
    return success_response(data, request_id=request.state.request_id)


@router.post("/demo")
def demo_login(request: Request, db: Session = Depends(get_db)) -> dict:
    data = AuthService(db).demo_login()
    data["user"] = UserRead.model_validate(data["user"])
    return success_response(data, request_id=request.state.request_id)


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    # 当前 JWT 无服务端会话状态；登出接口用于前端清理 token，并保留鉴权边界。
    return success_response(None, request_id=request.state.request_id)
