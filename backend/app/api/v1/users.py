from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user
from app.core.placeholders import not_implemented
from app.models.user import User
from app.schemas.user import UserUpdate

router = APIRouter()


@router.get("/me")
def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.put("/me")
def update_me(
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()
