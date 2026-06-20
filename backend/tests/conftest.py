import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.config import settings
from app.db.base import Base
from app.main import app


@pytest.fixture(autouse=True)
def isolate_secret_settings(monkeypatch):
    # 每个测试默认清空环境级 Key，避免本机真实配置影响缺 Key 场景断言。
    monkeypatch.setattr(settings, "openai_api_key", None)


@pytest.fixture
def db_session() -> Session:
    # 使用进程内 SQLite 和 StaticPool，让 TestClient 请求共享同一个临时数据库。
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        # 测试结束销毁 schema，保证用例之间任务、用户、日志完全隔离。
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(db_session: Session) -> TestClient:
    def override_get_db():
        # API 依赖注入改为测试 session，避免访问开发或生产数据库。
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth_headers(client: TestClient, username: str = "alice", email: str = "alice@example.com") -> dict:
    # 通过真实注册接口拿 token，顺带覆盖鉴权链路而不是手造 JWT。
    response = client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": "12345678"},
    )
    assert response.status_code == 201
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
