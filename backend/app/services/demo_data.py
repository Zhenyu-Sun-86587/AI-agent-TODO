from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.task import Task
from app.models.user import User
from app.models.user_setting import UserSetting
from app.schemas.task import TaskStatus

DEMO_USERNAME = "demo_user"
DEMO_EMAIL = "demo@aitodo.dev"
DEMO_PASSWORD = "aitodo-demo-account"
DEMO_TIMEZONE = ZoneInfo("Asia/Shanghai")


def ensure_demo_account(db: Session) -> User:
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not user:
        user = User(
            username=DEMO_USERNAME,
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
        )
        db.add(user)
        db.flush()
    elif user.username != DEMO_USERNAME:
        user.username = DEMO_USERNAME
        db.add(user)

    if user.setting:
        user.setting.model_name = settings.openai_default_model
        user.setting.openai_api_key_encrypted = None
        db.add(user.setting)
    else:
        db.add(UserSetting(user_id=user.id, model_name=settings.openai_default_model))

    if not db.query(Task).filter(Task.user_id == user.id).first():
        db.add_all(build_demo_tasks(user.id))

    return user


def build_demo_tasks(user_id: int) -> list[Task]:
    now = datetime.now(DEMO_TIMEZONE)
    return [
        _build_demo_task(
            user_id=user_id,
            title="完成演示说明稿定稿",
            description="把演示开场、任务中心、日历和统计页的讲解顺序统一。",
            priority="high",
            category="文档",
            status=TaskStatus.done.value,
            created_at=_local_dt(now, -6, 9, 0),
            updated_at=_local_dt(now, -5, 18, 30),
            due_time=_local_dt(now, -1, 18, 0),
        ),
        _build_demo_task(
            user_id=user_id,
            title="梳理 TaskPilot 演示流程",
            description="确认登录、创建任务、筛选和完成状态切换的演示路径。",
            priority="high",
            category="项目演示",
            created_at=_local_dt(now, -5, 10, 0),
            updated_at=_local_dt(now, -5, 10, 0),
            due_time=_local_dt(now, 0, 9, 30),
        ),
        _build_demo_task(
            user_id=user_id,
            title="校对任务筛选和排序",
            description="检查任务中心的分类、优先级、状态和关键字筛选。",
            priority="medium",
            category="任务中心",
            created_at=_local_dt(now, -4, 11, 0),
            updated_at=_local_dt(now, -4, 11, 0),
            due_time=_local_dt(now, 0, 15, 0),
        ),
        _build_demo_task(
            user_id=user_id,
            title="补全 API 对接说明",
            description="整理任务列表和状态更新接口的展示说明。",
            priority="high",
            category="文档",
            created_at=_local_dt(now, -3, 9, 45),
            updated_at=_local_dt(now, -3, 9, 45),
            due_time=_local_dt(now, 1, 10, 0),
        ),
        _build_demo_task(
            user_id=user_id,
            title="核对周视图时间轴",
            description="检查日历页面按小时排列的任务是否清晰。",
            priority="medium",
            category="日历",
            created_at=_local_dt(now, -2, 14, 20),
            updated_at=_local_dt(now, -2, 14, 20),
            due_time=_local_dt(now, 2, 16, 0),
        ),
        _build_demo_task(
            user_id=user_id,
            title="准备答辩材料",
            description="整理要展示的任务中心筛选、日历周视图和统计卡片。",
            priority="low",
            category="生活",
            created_at=_local_dt(now, -1, 17, 10),
            updated_at=_local_dt(now, -1, 17, 10),
            due_time=_local_dt(now, 3, 11, 30),
        ),
        _build_demo_task(
            user_id=user_id,
            title="验证 AI 创建任务链路",
            description="确保 AI 生成的任务能落到任务中心和日历中。",
            priority="high",
            category="测试",
            created_at=_local_dt(now, 0, 8, 50),
            updated_at=_local_dt(now, 0, 8, 50),
            due_time=_local_dt(now, 4, 19, 0),
            is_ai_created=True,
        ),
        _build_demo_task(
            user_id=user_id,
            title="检查统计接口返回",
            description="核对任务完成率、分类和优先级统计的数据是否合理。",
            priority="medium",
            category="后端联调",
            created_at=_local_dt(now, 0, 9, 15),
            updated_at=_local_dt(now, 0, 9, 15),
            due_time=_local_dt(now, 5, 15, 0),
        ),
        _build_demo_task(
            user_id=user_id,
            title="整理一周复盘笔记",
            description="收集演示过程中的问题、待优化点和后续计划。",
            priority="low",
            category="复盘",
            created_at=_local_dt(now, -1, 20, 0),
            updated_at=_local_dt(now, -1, 20, 0),
            due_time=_local_dt(now, 6, 9, 0),
        ),
    ]


def _build_demo_task(
    user_id: int,
    title: str,
    description: str,
    priority: str,
    category: str,
    created_at: datetime,
    updated_at: datetime,
    due_time: datetime,
    status: str = TaskStatus.todo.value,
    is_ai_created: bool = False,
) -> Task:
    return Task(
        user_id=user_id,
        title=title,
        description=description,
        priority=priority,
        category=category,
        due_time=due_time.astimezone(timezone.utc),
        status=status,
        is_ai_created=is_ai_created,
        created_at=created_at.astimezone(timezone.utc),
        updated_at=updated_at.astimezone(timezone.utc),
    )


def _local_dt(base: datetime, day_offset: int, hour: int, minute: int) -> datetime:
    target = base + timedelta(days=day_offset)
    return target.replace(hour=hour, minute=minute, second=0, microsecond=0)
