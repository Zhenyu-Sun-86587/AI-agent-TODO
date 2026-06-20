from fastapi import APIRouter, Request

from app.api.v1 import ai, auth, settings as settings_routes, stats, tasks, users
from app.core.response import success_response

api_router = APIRouter()


@api_router.get("/health", tags=["system"])
def api_health_check(request: Request) -> dict:
    # API 层健康检查也走统一响应结构，便于前端和网关按 code/request_id 解析。
    return success_response({"status": "ok"}, request_id=request.state.request_id)


api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(settings_routes.router, prefix="/settings", tags=["settings"])
