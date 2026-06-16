import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.errors import BusinessError
from app.db.base import Base
from app.models.user import User
from app.schemas.ai import AiChatMessage, AiSuggestRequest, CreateTaskByAiRequest, ParseTaskRequest
from app.schemas.task import Priority, TaskCreate
from app.services.ai_service import AiService
from app.services.setting_service import SettingService
from app.services.task_service import TaskService


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


def test_agent_chat_creates_task_from_ai_decision(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "sk-env-secret-5678")
    db = make_db()
    user = make_user(db)
    service = AiService(db)

    def fake_call_agent_model(api_key, model_name, messages, current_user, follow_up_mode, timezone_name):
        assert api_key == "sk-env-secret-5678"
        assert model_name == "deepseek-v4-pro"
        assert current_user.id == user.id
        assert follow_up_mode is True
        assert timezone_name == "Asia/Shanghai"
        assert messages[0].content == "帮我创建明天交报告"
        return """
        {
          "action": "create_task",
          "message": "已创建任务：明天交报告",
          "task": {
            "title": "明天交报告",
            "description": null,
            "priority": "high",
            "category": "学习",
            "due_time": null
          }
        }
        """

    monkeypatch.setattr(service, "_call_agent_model", fake_call_agent_model)

    response = service.chat(
        user,
        [AiChatMessage(role="user", content="帮我创建明天交报告")],
        "deepseek-v4-pro",
        agent_mode=True,
        follow_up_mode=True,
    )

    assert response.agent_action == "create_task"
    assert response.task_changed is True
    assert response.task is not None
    assert response.task.title == "明天交报告"
    assert response.task.priority == Priority.high


def test_agent_chat_follow_up_mode_blocks_uncertain_task_json(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "sk-env-secret-5678")
    db = make_db()
    user = make_user(db)
    service = AiService(db)

    def fake_call_agent_model(api_key, model_name, messages, current_user, follow_up_mode, timezone_name):
        return """
        {
          "action": "create_task",
          "message": "",
          "uncertain_fields": ["due_time", "priority"],
          "task": {
            "title": "写实验报告",
            "description": null,
            "priority": "medium",
            "category": "学习",
            "due_time": null
          }
        }
        """

    monkeypatch.setattr(service, "_call_agent_model", fake_call_agent_model)

    response = service.chat(
        user,
        [AiChatMessage(role="user", content="帮我加个写实验报告的任务")],
        "deepseek-v4-pro",
        agent_mode=True,
        follow_up_mode=True,
    )
    tasks, total = TaskService(db).list_tasks(user, page=1, page_size=10)

    assert response.agent_action == "follow_up"
    assert response.task_changed is False
    assert response.task is None
    assert "截止时间" in response.content
    assert "优先级" in response.content
    assert tasks == []
    assert total == 0


def test_agent_chat_updates_status_only_with_ai_selected_task(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "sk-env-secret-5678")
    db = make_db()
    user = make_user(db)
    task = TaskService(db).create_task(user, TaskCreate(title="软件工程报告", priority=Priority.medium))
    service = AiService(db)

    def fake_call_agent_model(api_key, model_name, messages, current_user, follow_up_mode, timezone_name):
        return f"""
        {{
          "action": "set_task_status",
          "message": "",
          "target_task_id": {task.id},
          "updates": {{"status": "done"}}
        }}
        """

    monkeypatch.setattr(service, "_call_agent_model", fake_call_agent_model)

    response = service.chat(
        user,
        [AiChatMessage(role="user", content="完成软件工程报告")],
        "deepseek-v4-pro",
        agent_mode=True,
    )

    assert response.agent_action == "set_task_status"
    assert response.task_changed is True
    assert response.task is not None
    assert response.task.status == "done"


def test_parse_task_without_api_key_fails(monkeypatch):
    """TC-AI-05: 未配 Key 且非 Mock 模式时，parse_task 返回 4001"""
    monkeypatch.setattr(settings, "ai_mock_mode", False)
    db = make_db()
    user = make_user(db)

    with pytest.raises(BusinessError) as exc_info:
        AiService(db).parse_task(
            user,
            ParseTaskRequest(text="完成软件工程报告", timezone="Asia/Shanghai"),
        )
    assert exc_info.value.code == 4001


def test_parse_task_with_empty_text_fails(client):
    """TC-AI-06: 空文本 parse_task 返回 422"""
    from conftest import auth_headers as _auth
    headers = _auth(client)

    response = client.post(
        "/api/ai/parse-task",
        headers=headers,
        json={"text": "", "timezone": "Asia/Shanghai"},
    )

    assert response.status_code == 422
    assert response.json()["code"] == 1001


def test_create_task_by_ai_without_overrides_succeeds(monkeypatch):
    """TC-AI-07: 不带 overrides 的 AI 创建任务正常"""
    monkeypatch.setattr(settings, "ai_mock_mode", True)
    db = make_db()
    user = make_user(db)

    result = AiService(db).create_task_by_ai(
        user,
        CreateTaskByAiRequest(
            text="明天下午三点完成软件工程报告，很重要",
            timezone="Asia/Shanghai",
        ),
    )

    task = result["task"]
    assert task.id is not None
    assert task.is_ai_created is True
    assert task.title
    assert result["parsed_task"].priority == Priority.high
