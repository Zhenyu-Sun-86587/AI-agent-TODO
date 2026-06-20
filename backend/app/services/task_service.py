from datetime import datetime
from typing import Optional

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Query, Session

from app.core.errors import BusinessError, ErrorCode
from app.models.task import Task
from app.models.user import User
from app.schemas.task import Priority, TaskCreate, TaskStatus, TaskStatusUpdate, TaskUpdate


class TaskService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_task(
        self,
        user: User,
        payload: TaskCreate,
        is_ai_created: bool = False,
    ) -> Task:
        # is_ai_created 只由 AI 创建入口传入，用于统计 AI 参与创建的任务数量。
        task = Task(
            user_id=user.id,
            title=payload.title,
            description=payload.description,
            priority=payload.priority.value,
            category=payload.category,
            due_time=payload.due_time,
            status=TaskStatus.todo.value,
            is_ai_created=is_ai_created,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def list_tasks(
        self,
        user: User,
        page: int,
        page_size: int,
        status: Optional[TaskStatus] = None,
        priority: Optional[Priority] = None,
        category: Optional[str] = None,
        keyword: Optional[str] = None,
        due_from: Optional[datetime] = None,
        due_to: Optional[datetime] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Task], int]:
        query = self.db.query(Task).filter(Task.user_id == user.id)
        # 所有筛选都限定在当前用户下，避免通过过滤或排序参数探测他人任务。
        if status:
            query = query.filter(Task.status == status.value)
        if priority:
            query = query.filter(Task.priority == priority.value)
        if category:
            query = query.filter(Task.category == category)
        if keyword and keyword.strip():
            pattern = f"%{keyword.strip()}%"
            query = query.filter(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
        if due_from:
            query = query.filter(Task.due_time >= due_from)
        if due_to:
            query = query.filter(Task.due_time <= due_to)

        total = query.count()
        # total 统计的是筛选后的总数，分页只影响 items，前端分页展示依赖这个口径。
        query = self._apply_sort(query, sort_by, sort_order)
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def get_task(self, user: User, task_id: int) -> Task:
        task = self.db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
        if not task:
            raise BusinessError(
                ErrorCode.TASK_NOT_FOUND,
                "任务不存在",
                status_code=404,
            )
        return task

    def update_task(self, user: User, task_id: int, payload: TaskUpdate) -> Task:
        task = self.get_task(user, task_id)
        fields_set = getattr(payload, "model_fields_set", set())
        # Pydantic 的 fields_set 区分“未传字段”和“传了 null”，支持清空描述/分类/截止时间。
        for field in ("title", "description", "category", "due_time"):
            if field in fields_set:
                setattr(task, field, getattr(payload, field))
        if "priority" in fields_set and payload.priority is not None:
            task.priority = payload.priority.value
        if "status" in fields_set and payload.status is not None:
            task.status = payload.status.value

        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete_task(self, user: User, task_id: int) -> None:
        task = self.get_task(user, task_id)
        self.db.delete(task)
        self.db.commit()

    def update_status(self, user: User, task_id: int, payload: TaskStatusUpdate) -> Task:
        task = self.get_task(user, task_id)
        task.status = payload.status.value
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def list_categories(self, user: User) -> list[dict]:
        # 分类列表只返回非空分类，并按任务数倒序，供前端筛选项和统计入口复用。
        rows = (
            self.db.query(Task.category, func.count(Task.id))
            .filter(Task.user_id == user.id, Task.category.isnot(None), Task.category != "")
            .group_by(Task.category)
            .order_by(func.count(Task.id).desc(), Task.category.asc())
            .all()
        )
        return [{"name": category, "task_count": task_count} for category, task_count in rows]

    def _apply_sort(self, query: Query, sort_by: str, sort_order: str) -> Query:
        direction_desc = sort_order == "desc"
        if sort_by == "priority":
            # priority 是字符串枚举，先映射成数值再排序，保证 high > medium > low。
            priority_order = case(
                (Task.priority == Priority.high.value, 3),
                (Task.priority == Priority.medium.value, 2),
                (Task.priority == Priority.low.value, 1),
                else_=0,
            )
            sort_expr = priority_order.desc() if direction_desc else priority_order.asc()
            return query.order_by(sort_expr, Task.created_at.desc(), Task.id.desc())

        sort_columns = {
            "created_at": Task.created_at,
            "updated_at": Task.updated_at,
            "due_time": Task.due_time,
        }
        column = sort_columns.get(sort_by, Task.created_at)
        sort_expr = column.desc() if direction_desc else column.asc()
        if sort_by == "due_time":
            # 无截止时间的任务排在有截止时间之后，避免空值抢占“最近截止”的位置。
            return query.order_by(Task.due_time.is_(None).asc(), sort_expr, Task.id.desc())
        return query.order_by(sort_expr, Task.id.desc())
