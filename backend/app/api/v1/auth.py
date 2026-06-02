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
    data = AuthService(db).register(payload)
    data["user"] = UserRead.model_validate(data["user"])
    return success_response(data, request_id=request.state.request_id)


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    data = AuthService(db).login(payload)
    data["user"] = UserRead.model_validate(data["user"])
    return success_response(data, request_id=request.state.request_id)


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return success_response(None, request_id=request.state.request_id)
