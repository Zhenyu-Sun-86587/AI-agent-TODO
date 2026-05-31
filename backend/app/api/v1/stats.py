from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import get_current_user
from app.core.placeholders import not_implemented
from app.models.user import User

router = APIRouter()


@router.get("/overview")
def overview(
    request: Request,
    from_time: Optional[datetime] = Query(None, alias="from"),
    to_time: Optional[datetime] = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.get("/category")
def category_stats(
    request: Request,
    from_time: Optional[datetime] = Query(None, alias="from"),
    to_time: Optional[datetime] = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.get("/priority")
def priority_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()


@router.get("/trend")
def trend_stats(
    request: Request,
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
) -> dict:
    return not_implemented()
