from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    # 通用响应模型描述前后端协议；实际路由由 success_response/errors 生成同形结构。
    code: int
    message: str
    data: Optional[T] = None
    request_id: Optional[str] = None


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PageResult(BaseModel, Generic[T]):
    # 分页列表固定为 items + pagination，便于不同资源列表复用前端组件。
    items: List[T]
    pagination: Pagination
