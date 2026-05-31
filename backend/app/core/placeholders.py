from app.core.errors import BusinessError, ErrorCode


def not_implemented():
    raise BusinessError(
        ErrorCode.INTERNAL_ERROR,
        "Not implemented yet",
        status_code=501,
    )
