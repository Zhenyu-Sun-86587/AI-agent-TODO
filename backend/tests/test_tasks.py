from datetime import datetime, timedelta, timezone

from conftest import auth_headers


def test_task_crud_status_and_nullable_updates(client):
    """覆盖任务 CRUD 主链路，并确认显式 null 可以清空可空字段。"""
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
        json={"status": "in_progress"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "in_progress"

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
    """列表接口同时验证过滤、优先级排序和分类聚合的统计口径。"""
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
    client.patch(f"/api/tasks/{second['id']}/status", headers=headers, json={"status": "in_progress"})

    response = client.get("/api/tasks", headers=headers, params={"status": "todo"})
    assert response.status_code == 200
    assert response.json()["data"]["pagination"]["total"] == 2

    response = client.get("/api/tasks", headers=headers, params={"status": "in_progress"})
    assert response.status_code == 200
    assert response.json()["data"]["pagination"]["total"] == 1

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
    """任务访问必须按用户隔离，其他用户看到的是 404 而不是任务详情。"""
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


def test_create_task_with_minimal_fields_uses_defaults(client):
    """TC-TASK-05: 仅标题创建任务，验证默认值"""
    headers = auth_headers(client)

    response = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "最小字段测试任务"},
    )

    assert response.status_code == 201
    task = response.json()["data"]
    assert task["title"] == "最小字段测试任务"
    assert task["priority"] == "medium"
    assert task["status"] == "todo"
    assert task["description"] is None
    assert task["category"] is None
    assert task["due_time"] is None
    assert task["is_ai_created"] is False


def test_create_task_with_empty_title_fails(client):
    """TC-TASK-06: 空标题创建返回 422"""
    headers = auth_headers(client)

    response = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": ""},
    )

    assert response.status_code == 422
    assert response.json()["code"] == 1001


def test_update_nonexistent_task_fails(client):
    """TC-TASK-07: 更新不存在的任务返回 404/3001"""
    headers = auth_headers(client)

    response = client.put(
        "/api/tasks/99999",
        headers=headers,
        json={"title": "不会成功的更新"},
    )

    assert response.status_code == 404
    assert response.json()["code"] == 3001


def test_cannot_update_other_users_task(client):
    """TC-TASK-08: 用户 A 无法更新用户 B 的任务"""
    alice_headers = auth_headers(client, username="alice", email="alice@example.com")
    task_id = client.post(
        "/api/tasks",
        headers=alice_headers,
        json={"title": "Alice task"},
    ).json()["data"]["id"]

    bob_headers = auth_headers(client, username="bob", email="bob@example.com")
    response = client.put(
        f"/api/tasks/{task_id}",
        headers=bob_headers,
        json={"title": "Bob trying to edit"},
    )

    assert response.status_code == 404
    assert response.json()["code"] == 3001


def test_filter_tasks_by_due_time_range(client):
    """TC-TASK-09: due_from/due_to 范围筛选任务"""
    headers = auth_headers(client)
    from datetime import datetime, timedelta, timezone

    base = datetime.now(timezone.utc)
    yesterday = (base - timedelta(days=1)).isoformat()
    next_week = (base + timedelta(days=7)).isoformat()
    next_month = (base + timedelta(days=30)).isoformat()

    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "上周截止", "due_time": yesterday},
    )
    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "下周截止", "due_time": next_week},
    )
    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "下月截止", "due_time": next_month},
    )

    # 只应命中今天到两周后的任务，过去和更远未来的任务都排除。
    today = base.isoformat()
    two_weeks = (base + timedelta(days=14)).isoformat()
    response = client.get(
        "/api/tasks",
        headers=headers,
        params={"due_from": today, "due_to": two_weeks},
    )
    items = response.json()["data"]["items"]
    titles = {t["title"] for t in items}
    assert "下周截止" in titles
    assert "上周截止" not in titles
    assert "下月截止" not in titles


def test_pagination_boundaries(client):
    """TC-TASK-10: 分页边界场景"""
    headers = auth_headers(client)

    for i in range(5):
        client.post(
            "/api/tasks",
            headers=headers,
            json={"title": f"分页测试任务 #{i+1}"},
        )

    # 第一页验证 total 和 total_pages 口径，items 只返回当前页。
    response = client.get(
        "/api/tasks",
        headers=headers,
        params={"page": 1, "page_size": 2},
    )
    pag = response.json()["data"]["pagination"]
    assert pag["page"] == 1
    assert pag["page_size"] == 2
    assert pag["total"] == 5
    assert pag["total_pages"] == 3
    assert len(response.json()["data"]["items"]) == 2

    # 最后一页只剩 1 条，验证 offset/limit 的边界行为。
    response = client.get(
        "/api/tasks",
        headers=headers,
        params={"page": 3, "page_size": 2},
    )
    assert response.json()["data"]["pagination"]["total_pages"] == 3
    assert len(response.json()["data"]["items"]) == 1
