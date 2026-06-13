from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.models.user import User
from app.schemas.ai import AiChatMessage, AiSuggestRequest, CreateTaskByAiRequest, ParseTaskRequest
from app.schemas.task import Priority
from app.services.ai_service import AiService
from app.services.setting_service import SettingService


def make_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, future=True)
    Base.metadata.create_all(bind=engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)()


def make_user(db):
    user = User(username="member_c", email="member_c@example.com", password_hash="hashed")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_parse_task_uses_mock_fallback_and_logs(monkeypatch):
    monkeypatch.setattr(settings, "ai_mock_mode", True)
    db = make_db()
    user = make_user(db)

    result = AiService(db).parse_task(
        user,
        ParseTaskRequest(text="明天下午三点完成软件工程报告，很重要", timezone="Asia/Shanghai"),
    )

    parsed = result["parsed_task"]
    assert result["ai_status"] == "mocked"
    assert parsed.title
    assert parsed.priority == Priority.high
    assert parsed.category == "学习"
    assert parsed.due_time is not None

    logs, total = AiService(db).list_logs(user, page=1, page_size=20)
    assert total == 1
    assert logs[0].status == "mocked"
    assert logs[0].output_json["priority"] == "high"


def test_suggest_task_fields_in_mock_mode(monkeypatch):
    monkeypatch.setattr(settings, "ai_mock_mode", True)
    db = make_db()
    user = make_user(db)

    suggestion = AiService(db).suggest_task_fields(
        user,
        AiSuggestRequest(title="准备项目答辩 PPT", description="整理演示流程").title,
        "整理演示流程",
    )

    assert suggestion.priority == Priority.high
    assert suggestion.category == "项目"
    assert suggestion.reason


def test_create_task_by_ai_persists_ai_task_with_overrides(monkeypatch):
    monkeypatch.setattr(settings, "ai_mock_mode", True)
    db = make_db()
    user = make_user(db)

    result = AiService(db).create_task_by_ai(
        user,
        CreateTaskByAiRequest(
            text="明天下午三点完成软件工程报告，很重要",
            timezone="Asia/Shanghai",
            overrides={"category": "课程", "priority": "high"},
        ),
    )

    task = result["task"]
    assert task.id is not None
    assert task.is_ai_created is True
    assert task.category == "课程"
    assert task.priority == "high"


def test_setting_service_encrypts_and_masks_openai_key():
    db = make_db()
    user = make_user(db)
    service = SettingService(db)

    setting = service.update(
        user,
        openai_api_key="sk-test-secret-1234",
        model_name="gpt-4o-mini",
        openai_key_provided=True,
    )
    read_data = service.to_read(setting)

    assert setting.openai_api_key_encrypted != "sk-test-secret-1234"
    assert service.require_openai_api_key(user) == "sk-test-secret-1234"
    assert read_data["has_openai_api_key"] is True
    assert read_data["openai_api_key_masked"] == "sk-****1234"


def test_ai_service_uses_deepseek_base_url_for_deepseek_models():
    db = make_db()
    service = AiService(db)

    assert str(service._base_url_for_model("deepseek-v4-pro")) == settings.deepseek_base_url
    assert str(service._base_url_for_model("gpt-4o-mini")) == settings.openai_base_url


def test_setting_service_uses_env_api_key_fallback(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "sk-env-secret-5678")
    db = make_db()
    user = make_user(db)
    service = SettingService(db)

    read_data = service.to_read(service.get_or_create(user))

    assert service.require_openai_api_key(user) == "sk-env-secret-5678"
    assert read_data["has_openai_api_key"] is True
    assert read_data["openai_api_key_masked"] == "sk-****5678"


def test_chat_uses_requested_model_and_returns_content(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "sk-env-secret-5678")
    db = make_db()
    user = make_user(db)
    service = AiService(db)

    def fake_call_chat_model(api_key, model_name, messages):
        assert api_key == "sk-env-secret-5678"
        assert model_name == "deepseek-v4-pro"
        assert messages[0].content == "test"
        return "pong"

    monkeypatch.setattr(service, "_call_chat_model", fake_call_chat_model)

    response = service.chat(user, [AiChatMessage(role="user", content="test")], "deepseek-v4-pro")

    assert response.content == "pong"
    assert response.model_name == "deepseek-v4-pro"
