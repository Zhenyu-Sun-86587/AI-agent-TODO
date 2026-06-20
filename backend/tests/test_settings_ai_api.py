from conftest import auth_headers
from app.core.config import settings
from app.core.security import encrypt_secret
from app.models.user import User


def test_settings_get_update_and_delete_key(client):
    headers = auth_headers(client)

    response = client.get("/api/settings", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["has_openai_api_key"] is False
    assert response.json()["data"]["openai_api_key_masked"] is None

    response = client.put(
        "/api/settings",
        headers=headers,
        json={"openai_api_key": "sk-test-secret-1234", "model_name": "gpt-4o-mini"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["has_openai_api_key"] is True
    assert data["openai_api_key_masked"] == "sk-****1234"
    assert data["model_name"] == "gpt-4o-mini"

    response = client.put("/api/settings", headers=headers, json={"openai_api_key": None})
    assert response.status_code == 200
    assert response.json()["data"]["has_openai_api_key"] is False
    assert response.json()["data"]["openai_api_key_masked"] is None


def test_test_openai_key_without_saved_key_returns_business_error(client):
    headers = auth_headers(client)

    response = client.post("/api/settings/test-openai-key", headers=headers, json={})

    assert response.status_code == 400
    assert response.json()["code"] == 4001


def test_ai_parse_suggest_create_and_logs_in_mock_mode(client, monkeypatch):
    monkeypatch.setattr(settings, "ai_mock_mode", True)
    headers = auth_headers(client)

    response = client.post(
        "/api/ai/parse-task",
        headers=headers,
        json={"text": "明天下午三点完成软件工程报告，很重要", "timezone": "Asia/Shanghai"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["ai_status"] == "mocked"
    assert data["parsed_task"]["priority"] == "high"
    assert data["parsed_task"]["category"] == "学习"

    response = client.post(
        "/api/ai/suggest",
        headers=headers,
        json={"title": "准备项目答辩 PPT", "description": "整理演示流程"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["priority"] == "high"
    assert response.json()["data"]["category"] == "项目"

    response = client.post(
        "/api/ai/create-task",
        headers=headers,
        json={
            "text": "明天下午三点完成软件工程报告，很重要",
            "timezone": "Asia/Shanghai",
            "overrides": {"category": "课程"},
        },
    )
    assert response.status_code == 201
    task = response.json()["data"]["task"]
    assert task["is_ai_created"] is True
    assert task["category"] == "课程"

    response = client.get("/api/ai/logs", headers=headers, params={"status": "mocked"})
    assert response.status_code == 200
    assert response.json()["data"]["pagination"]["total"] == 3


def test_ai_chat_endpoint_uses_deepseek_model(client, monkeypatch):
    headers = auth_headers(client)
    monkeypatch.setattr(settings, "openai_api_key", "sk-env-secret-5678")

    def fake_call_chat_model(self, api_key, model_name, messages):
        assert api_key == "sk-env-secret-5678"
        assert model_name == "deepseek-v4-pro"
        assert messages[0].content == "test"
        return "收到：test"

    monkeypatch.setattr("app.services.ai_service.AiService._call_chat_model", fake_call_chat_model)

    response = client.post(
        "/api/ai/chat",
        headers=headers,
        json={
            "model_name": "deepseek-v4-pro",
            "messages": [{"role": "user", "content": "test"}],
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["content"] == "收到：test"
    assert response.json()["data"]["model_name"] == "deepseek-v4-pro"


def test_demo_login_resets_ai_settings_to_current_default(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "sk-env-secret-5678")
    monkeypatch.setattr(settings, "openai_default_model", "deepseek-v4-pro")

    response = client.post("/api/auth/demo")
    assert response.status_code == 200
    token = response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    demo_user = db_session.query(User).filter(User.email == "demo@aitodo.dev").one()
    demo_user.setting.model_name = "gpt-4-turbo"
    demo_user.setting.openai_api_key_encrypted = encrypt_secret("sk-old-demo-key-1234")
    db_session.add(demo_user.setting)
    db_session.commit()

    response = client.post("/api/auth/demo")
    assert response.status_code == 200

    db_session.refresh(demo_user.setting)
    assert demo_user.setting.model_name == "deepseek-v4-pro"
    assert demo_user.setting.openai_api_key_encrypted is None

    response = client.get("/api/settings", headers=headers)
    data = response.json()["data"]
    assert data["model_name"] == "deepseek-v4-pro"
    assert data["openai_api_key_masked"] == "sk-****5678"


def test_update_model_name_only_does_not_clear_key(client):
    """TC-SET-04: 只更新 model_name 不覆盖已保存的 Key"""
    headers = auth_headers(client)

    client.put(
        "/api/settings",
        headers=headers,
        json={"openai_api_key": "sk-test-secret-1234", "model_name": "gpt-4o-mini"},
    )

    client.put(
        "/api/settings",
        headers=headers,
        json={"model_name": "gpt-4-turbo"},
    )

    response = client.get("/api/settings", headers=headers)
    data = response.json()["data"]
    assert data["has_openai_api_key"] is True
    assert data["openai_api_key_masked"] == "sk-****1234"
    assert data["model_name"] == "gpt-4-turbo"


def test_save_empty_string_as_api_key_clears_key(client):
    """TC-SET-05: 保存空字符串 Key 时应清空已保存 Key"""
    headers = auth_headers(client)

    client.put(
        "/api/settings",
        headers=headers,
        json={"openai_api_key": "sk-test-secret-1234"},
    )

    response = client.put(
        "/api/settings",
        headers=headers,
        json={"openai_api_key": ""},
    )
    data = response.json()["data"]
    assert data["has_openai_api_key"] is False
    assert data["openai_api_key_masked"] is None
