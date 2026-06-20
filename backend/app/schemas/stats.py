from datetime import date
from typing import Optional

from pydantic import BaseModel

from app.schemas.task import Priority


class StatsOverview(BaseModel):
    # 统计接口返回聚合后的只读数据，不暴露任务明细，避免客户端重复计算口径。
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
    # 趋势按日期聚合，date 不带时区；时间窗口解释由服务层统一处理。
    date: date
    created: int
    done: int
