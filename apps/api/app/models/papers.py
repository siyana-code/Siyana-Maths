from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PaperPart(BaseModel):
    id: UUID
    paper_id: UUID
    part_code: str
    title: str
    part_type: str
    question_count: int
    selection_limit: int
    marks_per_question: Decimal
    total_marks: Decimal
    sort_order: int


class PaperSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: UUID
    slug: str
    title: str
    description: str | None = None
    paper_number: str
    medium: str
    total_marks: Decimal | None = None
    published_at: datetime | None = None
    level: dict[str, Any] | None = None
    subject: dict[str, Any] | None = None
    exam_year: dict[str, Any] | None = None


class PaperListMeta(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)


class PaperListResponse(BaseModel):
    data: list[PaperSummary]
    meta: PaperListMeta
