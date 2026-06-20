from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from conftest import auth_headers
from app.core.config import settings


def test_stats_overview_empty_tasks(client):
    """无任务时 overview 所有计数和完成率都应为 0。"""
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
    """综合统计用 Mock AI 创建任务，覆盖 AI 创建数、分类、优先级和趋势。"""
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

    # overview 统计的是当前用户全部任务，完成率为 done / total。
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
    """from/to 时间范围过滤 created_at，而不是 due_time 或 updated_at。"""
    headers = auth_headers(client)
    client.post("/api/tasks", headers=headers, json={"title": "范围内任务"})

    future_from = (datetime.now(ZoneInfo("Asia/Shanghai")) + timedelta(days=1)).isoformat()
    response = client.get("/api/stats/overview", headers=headers, params={"from": future_from})

    assert response.status_code == 200
    assert response.json()["data"]["total_tasks"] == 0


def test_trend_days_boundary(client):
    """TC-STAT-04: trend days=1 边界返回仅当天数据"""
    headers = auth_headers(client)

    response = client.get("/api/stats/trend", headers=headers, params={"days": 1})

    assert response.status_code == 200
    trend = response.json()["data"]
    assert len(trend) == 1
    assert "date" in trend[0]
    assert "created" in trend[0]
    assert "done" in trend[0]


def test_overview_only_overdue_tasks(client):
    """TC-STAT-05: 只含逾期任务的 overview 统计正确"""
    headers = auth_headers(client)
    from datetime import datetime, timedelta, timezone

    # 逾期统计只计算仍处于 todo 的、截止时间早于当前时间的任务。
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "已逾期任务", "due_time": yesterday},
    )
    client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "另一个逾期任务", "due_time": yesterday},
    )

    response = client.get("/api/stats/overview", headers=headers)
    overview = response.json()["data"]
    assert overview["total_tasks"] == 2
    assert overview["todo_tasks"] == 2
    assert overview["done_tasks"] == 0
    assert overview["completion_rate"] == 0.0
    assert overview["overdue_tasks"] == 2
