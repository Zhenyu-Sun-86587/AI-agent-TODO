from app.core.errors import BusinessError, ErrorCode


def not_implemented():
    # 对尚未落地的占位接口统一返回 501，避免误报成普通 500。
    raise BusinessError(
        ErrorCode.INTERNAL_ERROR,
        "Not implemented yet",
        status_code=501,
    )
