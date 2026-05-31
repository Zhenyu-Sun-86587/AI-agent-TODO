from datetime import date
from typing import Optional

from pydantic import BaseModel

from app.schemas.task import Priority


class StatsOverview(BaseModel):
    total_tasks: int
    done_tasks: int
    todo_tasks: int
    completion_rate: float
    overdue_tasks: int
    today_due_tasks: int
    ai_created_tasks: int


class CategoryStats(BaseModel):
    category: str
    total: int
    done: int
    todo: int
    completion_rate: float


class PriorityStats(BaseModel):
    priority: Priority
    total: int
    done: int
    todo: int


class TrendStats(BaseModel):
    date: date
    created: int
    done: int
