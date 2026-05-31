from typing import Optional


def mask_api_key(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if len(value) < 8:
        return "****"
    return f"{value[:3]}****{value[-4:]}"
