from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
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
    items: List[T]
    pagination: Pagination
