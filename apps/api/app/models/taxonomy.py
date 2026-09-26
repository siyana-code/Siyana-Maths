from typing import Any

from pydantic import BaseModel


class TaxonomyResponse(BaseModel):
    levels: list[dict[str, Any]]
    subjects: list[dict[str, Any]]
    exam_years: list[dict[str, Any]]
    topics: list[dict[str, Any]]


class AdminPaperListMeta(BaseModel):
    page: int
    page_size: int
    total: int


class AdminPaperListResponse(BaseModel):
    data: list[dict[str, Any]]
    meta: AdminPaperListMeta
