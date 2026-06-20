from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.response import page_response, success_response
from app.models.user import User
from app.schemas.task import (
    CategoryRead,
    Priority,
    TaskCreate,
    TaskRead,
    TaskStatus,
    TaskStatusRead,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.services.task_service import TaskService

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # 受保护任务接口统一从 token 推导用户，禁止客户端指定 user_id。
    task = TaskService(db).create_task(current_user, payload)
    return success_response(TaskRead.model_validate(task), request_id=request.state.request_id)


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
    db: Session = Depends(get_db),
) -> dict:
    # 查询参数只表达筛选和排序意图，用户隔离与 SQL 细节由 TaskService 统一处理。
    items, total = TaskService(db).list_tasks(
        current_user,
        page=page,
        page_size=page_size,
        status=task_status,
        priority=priority,
        category=category,
        keyword=keyword,
        due_from=due_from,
        due_to=due_to,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    data = page_response([TaskRead.model_validate(item) for item in items], page, page_size, total)
    return success_response(data, request_id=request.state.request_id)


@router.get("/categories")
def list_categories(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    categories = [CategoryRead(**item) for item in TaskService(db).list_categories(current_user)]
    return success_response(categories, request_id=request.state.request_id)


@router.get("/{task_id}")
def get_task(
    task_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = TaskService(db).get_task(current_user, task_id)
    return success_response(TaskRead.model_validate(task), request_id=request.state.request_id)


@router.put("/{task_id}")
def update_task(
    task_id: int,
    payload: TaskUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = TaskService(db).update_task(current_user, task_id, payload)
    return success_response(TaskRead.model_validate(task), request_id=request.state.request_id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    # 204 响应不携带统一 JSON 体，避免违反 HTTP 无内容响应语义。
    TaskService(db).delete_task(current_user, task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{task_id}/status")
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = TaskService(db).update_status(current_user, task_id, payload)
    return success_response(
        TaskStatusRead.model_validate(task),
        request_id=request.state.request_id,
    )
