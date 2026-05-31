from fastapi import APIRouter, Depends, Request, status

from app.api.deps import get_current_user
from app.core.placeholders import not_implemented
from app.models.user import User
from app.schemas.auth import LoginRequest
from app.schemas.user import UserCreate

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, request: Request) -> dict:
    return not_implemented()


@router.post("/login")
def login(payload: LoginRequest, request: Request) -> dict:
    return not_implemented()


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()
