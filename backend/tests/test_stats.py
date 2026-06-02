from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from conftest import auth_headers
from app.core.config import settings


def test_stats_overview_empty_tasks(client):
    headers = auth_headers(client)

    response = client.get("/api/stats/overview", headers=headers)

    assert response.status_code == 200
    assert response.json()["data"] == {
        "total_tasks": 0,
        "done_tasks": 0,
        "todo_tasks": 0,
        "completion_rate": 0,
        "overdue_tasks": 0,
        "today_due_tasks": 0,
        "ai_created_tasks": 0,
    }


def test_stats_overview_category_priority_and_trend(client, monkeypatch):
    monkeypatch.setattr(settings, "ai_mock_mode", True)
    headers = auth_headers(client)
    shanghai = ZoneInfo("Asia/Shanghai")
    today_due = datetime.now(shanghai).replace(hour=18, minute=0, second=0, microsecond=0)

    task_a = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "title": "准备项目答辩 PPT",
            "priority": "high",
            "category": "项目",
            "due_time": today_due.isoformat(),
        },
    ).json()["data"]
    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "阅读数据库章节", "priority": "medium", "category": "学习"},
    )
    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "整理桌面", "priority": "low", "category": ""},
    )
    ai_task = client.post(
        "/api/ai/create-task",
        headers=headers,
        json={"text": "明天下午三点完成软件工程报告，很重要", "timezone": "Asia/Shanghai"},
    ).json()["data"]["task"]
    client.patch(f"/api/tasks/{task_a['id']}/status", headers=headers, json={"status": "done"})
    client.patch(f"/api/tasks/{ai_task['id']}/status", headers=headers, json={"status": "done"})

    response = client.get("/api/stats/overview", headers=headers)
    overview = response.json()["data"]
    assert overview["total_tasks"] == 4
    assert overview["done_tasks"] == 2
    assert overview["todo_tasks"] == 2
    assert overview["completion_rate"] == 0.5
    assert overview["today_due_tasks"] >= 1
    assert overview["ai_created_tasks"] == 1

    response = client.get("/api/stats/category", headers=headers)
    categories = {item["category"]: item for item in response.json()["data"]}
    assert categories["项目"]["total"] == 1
    assert categories["未分类"]["total"] == 1

    response = client.get("/api/stats/priority", headers=headers)
    priorities = {item["priority"]: item for item in response.json()["data"]}
    assert list(priorities) == ["high", "medium", "low"]
    assert priorities["high"]["total"] == 2
    assert priorities["medium"]["total"] == 1
    assert priorities["low"]["total"] == 1

    response = client.get("/api/stats/trend", headers=headers, params={"days": 7})
    trend = response.json()["data"]
    assert len(trend) == 7
    assert trend[-1]["created"] >= 4
    assert trend[-1]["done"] >= 2


def test_stats_time_range_filters_created_at(client):
    headers = auth_headers(client)
    client.post("/api/tasks", headers=headers, json={"title": "范围内任务"})

    future_from = (datetime.now(ZoneInfo("Asia/Shanghai")) + timedelta(days=1)).isoformat()
    response = client.get("/api/stats/overview", headers=headers, params={"from": future_from})

    assert response.status_code == 200
    assert response.json()["data"]["total_tasks"] == 0
