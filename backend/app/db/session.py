from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    # FastAPI 请求可能在线程池中执行，SQLite 需要关闭同线程检查才能复用连接。
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args, future=True)

# SessionLocal 是请求级会话工厂；提交/回滚由 service 层控制，依赖层只负责关闭。
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)
