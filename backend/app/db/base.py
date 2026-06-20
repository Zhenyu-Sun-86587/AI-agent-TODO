from app.db.base_class import Base
from app.models.ai_call_log import AiCallLog
from app.models.task import Task
from app.models.user import User
from app.models.user_setting import UserSetting

# Alembic 自动生成迁移依赖 Base.metadata，因此这里显式导入所有模型完成表注册。
__all__ = ["Base", "User", "Task", "UserSetting", "AiCallLog"]
