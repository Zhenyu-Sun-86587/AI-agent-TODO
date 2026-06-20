def test_health(client):
    # /health 作为最轻量的存活探针，不依赖统一响应包裹。
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_health(client):
    # /api/health 走统一 API 响应结构，用于验证基础中间件链路正常。
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"] == {"status": "ok"}
