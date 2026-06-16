from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.response import page_response, success_response
from app.models.user import User
from app.schemas.ai import AiChatRequest, AiLogRead, AiSuggestRequest, CreateTaskByAiRequest, ParseTaskRequest
from app.schemas.task import TaskRead
from app.services.ai_service import AiService

router = APIRouter()


@router.post("/parse-task")
def parse_task(
    payload: ParseTaskRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = AiService(db).parse_task(current_user, payload)
    return success_response(data, request_id=request.state.request_id)


@router.post("/create-task", status_code=status.HTTP_201_CREATED)
def create_task_by_ai(
    payload: CreateTaskByAiRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = AiService(db).create_task_by_ai(current_user, payload)
    data["task"] = TaskRead.model_validate(data["task"])
    return success_response(data, request_id=request.state.request_id)


@router.post("/suggest")
def suggest_task_fields(
    payload: AiSuggestRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = AiService(db).suggest_task_fields(current_user, payload.title, payload.description)
    return success_response(data, request_id=request.state.request_id)


@router.post("/chat")
def chat(
    payload: AiChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = AiService(db).chat(
        current_user,
        payload.messages,
        payload.model_name,
        follow_up_mode=payload.follow_up_mode,
        agent_mode=payload.agent_mode,
        timezone_name=payload.timezone,
    )
    return success_response(data, request_id=request.state.request_id)


@router.get("/logs")
def list_ai_logs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    log_status: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items, total = AiService(db).list_logs(current_user, page, page_size, log_status)
    data = page_response([AiLogRead.model_validate(item) for item in items], page, page_size, total)
    return success_response(data, request_id=request.state.request_id)
