from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status

from app.api.deps import get_current_user
from app.core.placeholders import not_implemented
from app.models.user import User
from app.schemas.ai import AiSuggestRequest, CreateTaskByAiRequest, ParseTaskRequest

router = APIRouter()


@router.post("/parse-task")
def parse_task(
    payload: ParseTaskRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.post("/create-task", status_code=status.HTTP_201_CREATED)
def create_task_by_ai(
    payload: CreateTaskByAiRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.post("/suggest")
def suggest_task_fields(
    payload: AiSuggestRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.get("/logs")
def list_ai_logs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    log_status: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()
