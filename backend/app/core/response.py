import math
from typing import Any, Optional


def success_response(
    data: Any = None,
    message: str = "ok",
    request_id: Optional[str] = None,
) -> dict:
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
    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": math.ceil(total / page_size) if total else 0,
        },
    }
