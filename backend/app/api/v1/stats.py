from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.response import success_response
from app.models.user import User
from app.schemas.stats import CategoryStats, PriorityStats, StatsOverview, TrendStats
from app.services.stats_service import StatsService

router = APIRouter()


@router.get("/overview")
def overview(
    request: Request,
    from_time: Optional[datetime] = Query(None, alias="from"),
    to_time: Optional[datetime] = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # 统计口径由服务层统一计算，路由只将查询时间窗传入并包裹响应。
    data = StatsOverview(**StatsService(db).overview(current_user, from_time, to_time))
    return success_response(data, request_id=request.state.request_id)


@router.get("/category")
def category_stats(
    request: Request,
    from_time: Optional[datetime] = Query(None, alias="from"),
    to_time: Optional[datetime] = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = [
        CategoryStats(**item)
        for item in StatsService(db).by_category(current_user, from_time, to_time)
    ]
    return success_response(data, request_id=request.state.request_id)


@router.get("/priority")
def priority_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = [PriorityStats(**item) for item in StatsService(db).by_priority(current_user)]
    return success_response(data, request_id=request.state.request_id)


@router.get("/trend")
def trend_stats(
    request: Request,
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # days 在入口限制范围，避免一次请求拉取过宽趋势窗口拖慢统计查询。
    data = [TrendStats(**item) for item in StatsService(db).trend(current_user, days)]
    return success_response(data, request_id=request.state.request_id)
