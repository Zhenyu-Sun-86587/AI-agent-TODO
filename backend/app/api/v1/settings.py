from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user
from app.core.placeholders import not_implemented
from app.models.user import User
from app.schemas.setting import OpenAIKeyTestRequest, UserSettingUpdate

router = APIRouter()


@router.get("")
def get_settings(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.put("")
def update_settings(
    payload: UserSettingUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.post("/test-openai-key")
def test_openai_key(
    payload: OpenAIKeyTestRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()
