from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.middleware import RequestIdMiddleware


def create_app() -> FastAPI:
    """应用工厂集中装配中间件、异常处理器和版本化 API 路由。"""
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
    )

    # RequestIdMiddleware 需要早于异常处理结果写入 request.state，便于统一响应携带 request_id。
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 所有业务异常、参数校验异常和兜底异常在这里注册，路由层无需重复包装错误格式。
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_prefix)

    @app.get("/health", tags=["system"])
    def health_check() -> dict:
        # 根健康检查保持极简结构，主要用于部署平台探活。
        return {"status": "ok"}

    return app


app = create_app()
