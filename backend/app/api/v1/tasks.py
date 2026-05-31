from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.api.deps import get_current_user
from app.core.placeholders import not_implemented
from app.models.user import User
from app.schemas.task import Priority, TaskCreate, TaskStatus, TaskStatusUpdate, TaskUpdate

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.get("")
def list_tasks(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    task_status: Optional[TaskStatus] = Query(None, alias="status"),
    priority: Optional[Priority] = None,
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    due_from: Optional[datetime] = None,
    due_to: Optional[datetime] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|due_time|priority|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.get("/categories")
def list_categories(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.get("/{task_id}")
def get_task(
    task_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.put("/{task_id}")
def update_task(
    task_id: int,
    payload: TaskUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> Response:
    return not_implemented()


@router.patch("/{task_id}/status")
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()
