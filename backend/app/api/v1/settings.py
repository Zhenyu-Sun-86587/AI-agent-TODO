from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.response import success_response
from app.models.user import User
from app.schemas.setting import OpenAIKeyTestRequest, UserSettingUpdate
from app.services.ai_service import AiService
from app.services.setting_service import SettingService

router = APIRouter()


@router.get("")
def get_settings(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = SettingService(db)
    setting = service.get_or_create(current_user)
    return success_response(service.to_read(setting), request_id=request.state.request_id)


@router.put("")
def update_settings(
    payload: UserSettingUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = SettingService(db)
    fields_set = getattr(payload, "model_fields_set", set())
    setting = service.update(
        current_user,
        openai_api_key=payload.openai_api_key,
        model_name=payload.model_name,
        openai_key_provided="openai_api_key" in fields_set,
    )
    return success_response(service.to_read(setting), request_id=request.state.request_id)


@router.post("/test-openai-key")
def test_openai_key(
    payload: OpenAIKeyTestRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    setting_service = SettingService(db)
    api_key = payload.openai_api_key or setting_service.require_openai_api_key(current_user)
    model_name = payload.model_name or setting_service.get_model_name(current_user)
    data = AiService(db).test_openai_key(api_key, model_name)
    return success_response(data, request_id=request.state.request_id)
