import math
from typing import Any, Optional


def success_response(
    data: Any = None,
    message: str = "ok",
    request_id: Optional[str] = None,
) -> dict:
    # 所有成功响应都通过这一层包裹，保证前端能稳定读取 code/message/data。
    payload = {
        "code": 0,
        "message": message,
        "data": data,
    }
    if request_id:
        payload["request_id"] = request_id
    return payload


def page_response(
    items: list,
    page: int,
    page_size: int,
    total: int,
) -> dict:
    # 分页元信息内嵌在 data 中，外层仍由 success_response 负责统一响应协议。
    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": math.ceil(total / page_size) if total else 0,
        },
    }
