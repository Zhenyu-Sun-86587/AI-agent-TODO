from datetime import datetime, timezone, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BusinessError, ErrorCode
from app.core.security import create_access_token, hash_password, verify_password
from app.models.task import Task
from app.models.user import User
from app.models.user_setting import UserSetting
from app.schemas.auth import LoginRequest
from app.schemas.user import UserCreate


class AuthService:
    DEMO_USERNAME = "demo_user"
    DEMO_EMAIL = "demo@aitodo.dev"
    DEMO_PASSWORD = "aitodo-demo-account"

    def __init__(self, db: Session) -> None:
        self.db = db

    def register(self, payload: UserCreate) -> dict:
        # 用户名和邮箱都作为登录凭据，注册时必须一起做唯一性检查。
        existing_user = (
            self.db.query(User)
            .filter(or_(User.username == payload.username, User.email == payload.email))
            .first()
        )
        if existing_user:
            raise BusinessError(
                ErrorCode.USER_EXISTS,
                "用户名或邮箱已存在",
                status_code=409,
            )

        user = User(
            username=payload.username,
            email=str(payload.email),
            password_hash=hash_password(payload.password),
        )
        self.db.add(user)
        self.db.flush()
        # 注册成功立即创建设置行，确保后续 AI 模型名读取有稳定默认值。
        self.db.add(UserSetting(user_id=user.id, model_name=settings.openai_default_model))
        self.db.commit()
        self.db.refresh(user)
        return self._auth_payload(user)

    def login(self, payload: LoginRequest) -> dict:
        user = (
            self.db.query(User)
            .filter(or_(User.username == payload.account, User.email == payload.account))
            .first()
        )
        if not user or not verify_password(payload.password, user.password_hash):
            raise BusinessError(
                ErrorCode.LOGIN_FAILED,
                "用户名、邮箱或密码错误",
                status_code=401,
            )
        return self._auth_payload(user)

    def demo_login(self) -> dict:
        user = self.db.query(User).filter(User.email == self.DEMO_EMAIL).first()
        is_new_user = user is None
        if not user:
            user = User(
                username=self.DEMO_USERNAME,
                email=self.DEMO_EMAIL,
                password_hash=hash_password(self.DEMO_PASSWORD),
            )
            self.db.add(user)
            self.db.flush()

        # 首次创建的 demo 用户自动填充示例任务，方便体验核心功能。
        if is_new_user:
            self._seed_demo_tasks(user)

        # Demo 账号每次登录都回到当前默认模型，并清掉个人 Key，避免上一次体验污染本次会话。
        if user.setting:
            user.setting.model_name = settings.openai_default_model
            user.setting.openai_api_key_encrypted = None
            self.db.add(user.setting)
        else:
            self.db.add(UserSetting(user_id=user.id, model_name=settings.openai_default_model))

        self.db.commit()
        self.db.refresh(user)
        return self._auth_payload(user)

    def _seed_demo_tasks(self, user: User) -> None:
        """为首次创建的 demo 用户填充示例任务，涵盖不同优先级、分类和状态。"""
        now = datetime.now(timezone.utc)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        seed_tasks = [
            {
                "title": "熟悉 AI-agent-TODO 系统",
                "description": "浏览 Dashboard、任务列表、AI 推荐、统计等核心页面，了解系统的基本功能模块。",
                "priority": "high",
                "category": "项目",
                "due_time": today + timedelta(days=0, hours=18),
                "status": "todo",
            },
            {
                "title": "创建第一个 AI 智能任务",
                "description": "在「AI 推荐」页面输入自然语言描述，体验 AI 自动解析任务标题、优先级、分类和截止时间。",
                "priority": "high",
                "category": "项目",
                "due_time": today + timedelta(days=1, hours=15),
                "status": "todo",
                "is_ai_created": True,
            },
            {
                "title": "完成软件工程课程报告",
                "description": "整理软件工程实验的实验过程与项目总结，准备课程答辩材料。",
                "priority": "high",
                "category": "学习",
                "due_time": today + timedelta(days=3, hours=23, minutes=59),
                "status": "todo",
            },
            {
                "title": "配置 BYOK OpenAI API Key",
                "description": "在「设置」页面填入自己的 OpenAI API Key，开启真实的 AI 解析能力（系统默认使用 Mock 模式兜底）。",
                "priority": "medium",
                "category": "项目",
                "due_time": today + timedelta(days=2, hours=12),
                "status": "todo",
            },
            {
                "title": "阅读前后端 API 接口文档",
                "description": "查看 doc/ 目录下的接口文档，了解 RESTful API 设计规范和 JWT 鉴权方式。",
                "priority": "medium",
                "category": "学习",
                "due_time": today + timedelta(days=4, hours=10),
                "status": "todo",
            },
            {
                "title": "尝试任务看板与日历视图",
                "description": "切换到看板视图查看任务状态分布，切换到日历视图按日期浏览任务。",
                "priority": "low",
                "category": "项目",
                "due_time": today + timedelta(days=7, hours=14),
                "status": "todo",
            },
            {
                "title": "查看数据统计面板",
                "description": "进入「数据统计」页面，了解任务完成率、分类分布、优先级分布和 30 天趋势。",
                "priority": "medium",
                "category": "项目",
                "due_time": today + timedelta(days=5, hours=16),
                "status": "todo",
            },
            {
                "title": "安装项目开发环境",
                "description": "按照 README 克隆仓库、创建虚拟环境、安装依赖，启动前后端服务。",
                "priority": "low",
                "category": "工作",
                "due_time": today + timedelta(days=0, hours=9),
                "status": "done",
            },
        ]

        for item in seed_tasks:
            task = Task(
                user_id=user.id,
                title=item["title"],
                description=item.get("description"),
                priority=item.get("priority", "medium"),
                category=item.get("category"),
                due_time=item.get("due_time"),
                status=item.get("status", "todo"),
                is_ai_created=item.get("is_ai_created", False),
                created_at=now,
            )
            self.db.add(task)

        self.db.flush()

    def _auth_payload(self, user: User) -> dict:
        return {
            "user": user,
            "access_token": create_access_token(str(user.id)),
            "token_type": "bearer",
            "expires_in": settings.access_token_expire_minutes * 60,
        }
