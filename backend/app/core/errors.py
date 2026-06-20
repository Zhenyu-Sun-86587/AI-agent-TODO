from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ErrorCode:
    # 错误码是前后端契约：0 表示成功，业务域按千位分段，5000 作为兜底内部错误。
    SUCCESS = 0
    PARAM_INVALID = 1001
    UNAUTHORIZED = 1002
    FORBIDDEN = 1003
    NOT_FOUND = 1004
    CONFLICT = 1005
    USER_EXISTS = 2001
    LOGIN_FAILED = 2002
    TASK_NOT_FOUND = 3001
    OPENAI_KEY_MISSING = 4001
    OPENAI_KEY_INVALID = 4002
    AI_PARSE_FAILED = 4003
    INTERNAL_ERROR = 5000


class BusinessError(Exception):
    """业务层主动抛出的可预期错误，统一由异常处理器转换为 JSON 响应。"""

    def __init__(
        self,
        code: int,
        message: str,
        status_code: int = 400,
        data: Optional[Any] = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.data = data


def _request_id(request: Request) -> Optional[str]:
    return getattr(request.state, "request_id", None)


def _payload(code: int, message: str, data: Any, request: Request) -> dict:
    # 成功和失败响应都保持 code/message/data/request_id 结构，方便客户端统一拦截。
    payload = {
        "code": code,
        "message": message,
        "data": data,
    }
    request_id = _request_id(request)
    if request_id:
        payload["request_id"] = request_id
    return payload


async def business_error_handler(request: Request, exc: BusinessError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_payload(exc.code, exc.message, exc.data, request),
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Pydantic 校验错误保留字段路径，前端可将错误定位到具体表单项。
    errors = [
        {
            "field": ".".join(str(item) for item in error.get("loc", [])),
            "message": error.get("msg", "Invalid value"),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=_payload(
            ErrorCode.PARAM_INVALID,
            "Parameter validation failed",
            {"errors": errors},
            request,
        ),
    )


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    # FastAPI/Starlette 的 HTTPException 统一映射到本项目错误码，避免裸 detail 泄漏到客户端。
    code = ErrorCode.INTERNAL_ERROR
    if exc.status_code == 401:
        code = ErrorCode.UNAUTHORIZED
    elif exc.status_code == 403:
        code = ErrorCode.FORBIDDEN
    elif exc.status_code == 404:
        code = ErrorCode.NOT_FOUND

    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content=_payload(code, message, None, request),
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # 未预期异常只返回通用信息，具体堆栈交给日志系统，避免暴露内部实现。
    return JSONResponse(
        status_code=500,
        content=_payload(ErrorCode.INTERNAL_ERROR, "Internal server error", None, request),
    )


def register_exception_handlers(app: FastAPI) -> None:
    # 注册顺序覆盖业务异常、请求校验、框架 HTTP 异常和最终兜底异常。
    app.add_exception_handler(BusinessError, business_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
