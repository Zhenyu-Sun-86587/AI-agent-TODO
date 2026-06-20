from typing import Optional


def mask_api_key(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if len(value) < 8:
        # 过短密钥不暴露任何片段，避免测试或异常配置中的敏感值泄露。
        return "****"
    # 仅保留前缀和末尾 4 位，前端可确认 Key 来源但不能还原完整密钥。
    return f"{value[:3]}****{value[-4:]}"
