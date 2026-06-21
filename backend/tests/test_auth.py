from conftest import auth_headers


def test_register_success_returns_user_and_token(client):
    """注册成功应返回用户安全字段和可用于后续请求的 Bearer Token。"""
    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "12345678"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["user"]["username"] == "alice"
    assert body["data"]["user"]["email"] == "alice@example.com"
    assert "password_hash" not in body["data"]["user"]
    assert body["data"]["access_token"]
    assert body["data"]["token_type"] == "bearer"


def test_register_duplicate_user_fails(client):
    """用户名或邮箱重复时，注册应返回稳定业务错误码。"""
    auth_headers(client)

    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "12345678"},
    )

    assert response.status_code == 409
    assert response.json()["code"] == 2001


def test_login_success_with_email(client):
    """邮箱登录覆盖 account 字段作为邮箱凭据的路径。"""
    auth_headers(client)

    response = client.post(
        "/api/auth/login",
        json={"account": "alice@example.com", "password": "12345678"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["user"]["username"] == "alice"
    assert response.json()["data"]["access_token"]


def test_demo_login_returns_backend_session(client):
    """Demo 登录返回真实后端会话，token 可继续访问 /users/me。"""
    response = client.post("/api/auth/demo")

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["user"]["username"] == "demo_user"
    assert body["data"]["user"]["email"] == "demo@aitodo.dev"
    assert body["data"]["access_token"]

    token = body["data"]["access_token"]
    me_response = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})

    assert me_response.status_code == 200
    assert me_response.json()["data"]["email"] == "demo@aitodo.dev"


def test_demo_login_seeds_weekly_tasks(client):
    """Demo 账号应自带一周演示任务，便于任务中心和日历直接展示。"""
    response = client.post("/api/auth/demo")

    assert response.status_code == 200
    token = response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    task_response = client.get("/api/tasks", headers=headers, params={"page_size": 20})
    assert task_response.status_code == 200
    data = task_response.json()["data"]
    assert data["pagination"]["total"] == 9

    titles = {item["title"] for item in data["items"]}
    assert {
        "完成演示说明稿定稿",
        "梳理 TaskPilot 演示流程",
        "校对任务筛选和排序",
        "补全 API 对接说明",
        "核对周视图时间轴",
        "准备答辩材料",
        "验证 AI 创建任务链路",
        "检查统计接口返回",
        "整理一周复盘笔记",
    } == titles

    categories = {item["name"] for item in client.get("/api/tasks/categories", headers=headers).json()["data"]}
    assert {"文档", "项目演示", "任务中心", "日历", "生活", "测试", "后端联调", "复盘"} <= categories


def test_demo_login_does_not_reset_existing_tasks(client):
    """再次登录 demo 账号时，不应该把已经存在的任务清空。"""
    response = client.post("/api/auth/demo")
    token = response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/tasks", headers=headers, json={"title": "演示中的临时补充任务"})

    response = client.post("/api/auth/demo")
    assert response.status_code == 200

    refreshed = client.get("/api/tasks", headers={"Authorization": f"Bearer {response.json()['data']['access_token']}"})
    assert refreshed.status_code == 200
    assert refreshed.json()["data"]["pagination"]["total"] == 10


def test_login_wrong_password_fails(client):
    """错误密码不暴露用户是否存在，只返回统一登录失败错误。"""
    auth_headers(client)

    response = client.post(
        "/api/auth/login",
        json={"account": "alice", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == 2002


def test_current_user_requires_authentication(client):
    """受保护接口缺少 Token 时应由鉴权依赖拦截。"""
    response = client.get("/api/users/me")

    assert response.status_code == 401
    assert response.json()["code"] == 1002


def test_get_and_update_current_user(client):
    """当前用户资料更新后，再读取应看到最新用户名和邮箱。"""
    headers = auth_headers(client)

    response = client.get("/api/users/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["username"] == "alice"

    response = client.put(
        "/api/users/me",
        headers=headers,
        json={"username": "alice_new", "email": "alice_new@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["username"] == "alice_new"
    assert response.json()["data"]["email"] == "alice_new@example.com"


def test_login_success_with_username(client):
    """TC-AUTH-07: 使用用户名（而非邮箱）登录成功"""
    auth_headers(client)

    response = client.post(
        "/api/auth/login",
        json={"account": "alice", "password": "12345678"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["user"]["username"] == "alice"
    assert response.json()["data"]["access_token"]


def test_register_duplicate_username_fails(client):
    """TC-AUTH-08: 重复用户名注册返回 409/2001"""
    client.post(
        "/api/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "12345678"},
    )

    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "email": "other@example.com", "password": "12345678"},
    )

    assert response.status_code == 409
    assert response.json()["code"] == 2001


def test_register_weak_password_fails(client):
    """TC-AUTH-09: 弱密码（少于8位）注册返回 422"""
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "email": "test@example.com", "password": "1234567"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == 1001


def test_register_invalid_email_fails(client):
    """TC-AUTH-10: 非法邮箱格式注册返回 422"""
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "email": "not-an-email", "password": "12345678"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == 1001


def test_tampered_token_returns_unauthorized(client):
    """TC-AUTH-11: 伪造 Token 访问受保护接口返回 401"""
    headers = {"Authorization": "Bearer tampered-invalid-token"}

    response = client.get("/api/users/me", headers=headers)

    assert response.status_code == 401
    assert response.json()["code"] == 1002
