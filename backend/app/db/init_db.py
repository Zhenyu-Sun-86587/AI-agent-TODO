from app.db.base import Base
from app.db.session import engine


def init_db() -> None:
    # 仅用于本地快速初始化；正式结构变更应通过 Alembic 迁移脚本管理。
    Base.metadata.create_all(bind=engine)
