from collections import defaultdict
from datetime import datetime, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Query, Session

from app.models.task import Task
from app.models.user import User
from app.schemas.task import Priority, TaskStatus
from app.utils.datetime import utc_now

APP_TIMEZONE = ZoneInfo("Asia/Shanghai")


class StatsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def overview(
        self,
        user: User,
        from_time: Optional[datetime] = None,
        to_time: Optional[datetime] = None,
    ) -> dict:
        query = self._task_query(user, from_time, to_time)
        # overview 的基础口径是创建时间范围内的任务，逾期/今日截止在这个集合上继续统计。
        total_tasks = query.count()
        done_tasks = query.filter(Task.status == TaskStatus.done.value).count()
        todo_tasks = query.filter(Task.status != TaskStatus.done.value).count()
        now = utc_now()
        overdue_tasks = query.filter(
            Task.status != TaskStatus.done.value,
            Task.due_time.isnot(None),
            Task.due_time < now,
        ).count()

        today_start, tomorrow_start = self._today_bounds()
        # 今日截止按应用时区的自然日计算，不按 UTC 日期切分。
        today_due_tasks = query.filter(
            Task.due_time.isnot(None),
            Task.due_time >= today_start,
            Task.due_time < tomorrow_start,
        ).count()
        ai_created_tasks = query.filter(Task.is_ai_created.is_(True)).count()
        return {
            "total_tasks": total_tasks,
            "done_tasks": done_tasks,
            "todo_tasks": todo_tasks,
            "completion_rate": self._rate(done_tasks, total_tasks),
            "overdue_tasks": overdue_tasks,
            "today_due_tasks": today_due_tasks,
            "ai_created_tasks": ai_created_tasks,
        }

    def by_category(
        self,
        user: User,
        from_time: Optional[datetime] = None,
        to_time: Optional[datetime] = None,
    ) -> list[dict]:
        buckets: dict[str, dict] = defaultdict(lambda: {"total": 0, "done": 0, "todo": 0})
        for task in self._task_query(user, from_time, to_time).all():
            # 空字符串和纯空白分类统一归入“未分类”，保持前端统计展示稳定。
            category = task.category.strip() if task.category and task.category.strip() else "未分类"
            bucket = buckets[category]
            bucket["total"] += 1
            if task.status == TaskStatus.done.value:
                bucket["done"] += 1
            else:
                bucket["todo"] += 1

        result = []
        for category, values in buckets.items():
            result.append(
                {
                    "category": category,
                    "total": values["total"],
                    "done": values["done"],
                    "todo": values["todo"],
                    "completion_rate": self._rate(values["done"], values["total"]),
                }
            )
        return sorted(result, key=lambda item: (-item["total"], item["category"]))

    def by_priority(self, user: User) -> list[dict]:
        # 固定输出 high/medium/low 三个桶，即使某个优先级没有任务也返回 0。
        values = {
            priority.value: {"priority": priority.value, "total": 0, "done": 0, "todo": 0}
            for priority in (Priority.high, Priority.medium, Priority.low)
        }
        for task in self._task_query(user).all():
            bucket = values.get(task.priority)
            if not bucket:
                continue
            bucket["total"] += 1
            if task.status == TaskStatus.done.value:
                bucket["done"] += 1
            else:
                bucket["todo"] += 1
        return [values[priority.value] for priority in (Priority.high, Priority.medium, Priority.low)]

    def trend(self, user: User, days: int) -> list[dict]:
        today = utc_now().astimezone(APP_TIMEZONE).date()
        start_date = today - timedelta(days=days - 1)
        # 先补齐每一天的桶，保证无任务日期也会返回 0，前端折线图不需要自行补点。
        buckets = {
            start_date + timedelta(days=offset): {"created": 0, "done": 0}
            for offset in range(days)
        }

        range_start = datetime.combine(start_date, time.min, tzinfo=APP_TIMEZONE)
        # 趋势统计同时看 created_at 和 updated_at：创建数按创建日，完成数按完成状态的更新时间。
        tasks = (
            self.db.query(Task)
            .filter(
                Task.user_id == user.id,
                ((Task.created_at >= range_start) | (Task.updated_at >= range_start)),
            )
            .all()
        )
        for task in tasks:
            created_date = self._local_date(task.created_at)
            if created_date in buckets:
                buckets[created_date]["created"] += 1
            if task.status == TaskStatus.done.value:
                done_date = self._local_date(task.updated_at)
                if done_date in buckets:
                    buckets[done_date]["done"] += 1

        return [
            {"date": day, "created": values["created"], "done": values["done"]}
            for day, values in buckets.items()
        ]

    def _task_query(
        self,
        user: User,
        from_time: Optional[datetime] = None,
        to_time: Optional[datetime] = None,
    ) -> Query:
        query = self.db.query(Task).filter(Task.user_id == user.id)
        # from/to 只过滤 created_at，表示“统计这段时间新建的任务”。
        if from_time:
            query = query.filter(Task.created_at >= from_time)
        if to_time:
            query = query.filter(Task.created_at <= to_time)
        return query

    def _today_bounds(self) -> tuple[datetime, datetime]:
        today = utc_now().astimezone(APP_TIMEZONE).date()
        today_start = datetime.combine(today, time.min, tzinfo=APP_TIMEZONE)
        tomorrow_start = today_start + timedelta(days=1)
        return today_start, tomorrow_start

    def _local_date(self, value: datetime):
        if value.tzinfo is None:
            # 数据库或测试里出现 naive datetime 时按 UTC 解释，再换算到应用时区。
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(APP_TIMEZONE).date()

    def _rate(self, done: int, total: int) -> float:
        # 完成率保留 4 位小数，空集合约定为 0，避免除零和 None 混入响应。
        return round(done / total, 4) if total else 0
