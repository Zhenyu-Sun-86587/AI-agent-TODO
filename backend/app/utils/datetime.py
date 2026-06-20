from datetime import datetime, timezone


def utc_now() -> datetime:
    # 统一使用带 UTC 时区的当前时间，避免统计和截止时间比较时混入 naive datetime。
    return datetime.now(timezone.utc)
