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
    user = UserService(db).update_me(current_user, payload)
    return success_response(UserRead.model_validate(user), request_id=request.state.request_id)
