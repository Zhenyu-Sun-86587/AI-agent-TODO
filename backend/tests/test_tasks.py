from datetime import datetime, timedelta, timezone

from conftest import auth_headers


def test_task_crud_status_and_nullable_updates(client):
    headers = auth_headers(client)
    due_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

    response = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "title": "完成 API 文档",
            "description": "补充接口字段",
            "priority": "high",
            "category": "学习",
            "due_time": due_time,
        },
    )
    assert response.status_code == 201
    task = response.json()["data"]
    task_id = task["id"]
    assert task["status"] == "todo"
    assert task["is_ai_created"] is False

    response = client.get(f"/api/tasks/{task_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["title"] == "完成 API 文档"

    response = client.put(
        f"/api/tasks/{task_id}",
        headers=headers,
        json={
            "title": "完成 API 文档终稿",
            "description": None,
            "category": None,
            "due_time": None,
            "priority": "medium",
        },
    )
    assert response.status_code == 200
    updated = response.json()["data"]
    assert updated["title"] == "完成 API 文档终稿"
    assert updated["description"] is None
    assert updated["category"] is None
    assert updated["due_time"] is None
    assert updated["priority"] == "medium"

    response = client.patch(
        f"/api/tasks/{task_id}/status",
        headers=headers,
        json={"status": "done"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "done"

    response = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert response.status_code == 204
    assert response.content == b""

    response = client.get(f"/api/tasks/{task_id}", headers=headers)
    assert response.status_code == 404
    assert response.json()["code"] == 3001


def test_task_list_filters_sorting_and_categories(client):
    headers = auth_headers(client)
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    next_week = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "准备项目答辩 PPT", "priority": "high", "category": "项目", "due_time": tomorrow},
    )
    second = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "阅读数据库章节", "priority": "medium", "category": "学习", "due_time": next_week},
    ).json()["data"]
    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "买牛奶", "description": "下班后", "priority": "low", "category": "生活"},
    )
    client.patch(f"/api/tasks/{second['id']}/status", headers=headers, json={"status": "done"})

    response = client.get("/api/tasks", headers=headers, params={"status": "todo"})
    assert response.status_code == 200
    assert response.json()["data"]["pagination"]["total"] == 2

    response = client.get("/api/tasks", headers=headers, params={"priority": "high"})
    assert response.json()["data"]["items"][0]["title"] == "准备项目答辩 PPT"

    response = client.get("/api/tasks", headers=headers, params={"category": "学习"})
    assert response.json()["data"]["pagination"]["total"] == 1

    response = client.get("/api/tasks", headers=headers, params={"keyword": "牛奶"})
    assert response.json()["data"]["items"][0]["category"] == "生活"

    response = client.get(
        "/api/tasks",
        headers=headers,
        params={"sort_by": "priority", "sort_order": "desc"},
    )
    assert response.json()["data"]["items"][0]["priority"] == "high"

    response = client.get("/api/tasks/categories", headers=headers)
    categories = {item["name"]: item["task_count"] for item in response.json()["data"]}
    assert categories == {"项目": 1, "学习": 1, "生活": 1}


def test_tasks_are_isolated_by_user(client):
    alice_headers = auth_headers(client, username="alice", email="alice@example.com")
    task_id = client.post(
        "/api/tasks",
        headers=alice_headers,
        json={"title": "Alice private task"},
    ).json()["data"]["id"]
    bob_headers = auth_headers(client, username="bob", email="bob@example.com")

    response = client.get(f"/api/tasks/{task_id}", headers=bob_headers)
    assert response.status_code == 404
    assert response.json()["code"] == 3001

    response = client.get("/api/tasks", headers=bob_headers)
    assert response.status_code == 200
    assert response.json()["data"]["pagination"]["total"] == 0
