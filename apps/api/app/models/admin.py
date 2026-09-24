from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Provider = Literal["youtube", "tiktok", "facebook"]
Medium = Literal["en", "si", "ta"]


class AdminUserResponse(BaseModel):
    id: UUID
    display_name: str
    role: str


class PaperCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    level_id: UUID
    subject_id: UUID
    exam_year_id: UUID
    paper_number: str = Field(min_length=1, max_length=20)
    medium: Medium = "si"
    description: str | None = Field(default=None, max_length=5000)
    total_marks: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    thumbnail_url: str | None = Field(default=None, max_length=2000)


class PaperPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    paper_number: str | None = Field(default=None, min_length=1, max_length=20)
    medium: Medium | None = None
    total_marks: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    thumbnail_url: str | None = Field(default=None, max_length=2000)


class QuestionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number_label: str = Field(min_length=1, max_length=40)
    position: int | None = Field(default=None, ge=1)
    prompt_markdown: str = Field(min_length=1, max_length=20000)
    marks: Decimal = Field(ge=0, max_digits=8, decimal_places=2)


class AnswerUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    solution_markdown: str = Field(min_length=1, max_length=50000)
    explanation_markdown: str | None = Field(default=None, max_length=20000)
    content_language: Medium = "si"


class MarkingItemCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    position: int | None = Field(default=None, ge=1)
    item_type: Literal["method", "alternative", "note"] = "method"
    method_label: str | None = Field(default=None, max_length=120)
    criterion_markdown: str = Field(min_length=1, max_length=20000)
    mark_value: Decimal = Field(ge=0, max_digits=8, decimal_places=2)
    award_note_markdown: str | None = Field(default=None, max_length=20000)
    is_alternative: bool = False


class VideoSourceCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Provider
    original_url: str = Field(min_length=1, max_length=2000)
    question_id: UUID | None = None
    is_primary: bool = False

    @field_validator("original_url")
    @classmethod
    def validate_original_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme.lower() != "https" or not parsed.hostname:
            raise ValueError("Video URLs must use HTTPS and include a hostname")
        return value

    @model_validator(mode="after")
    def validate_provider_url(self) -> "VideoSourceCreateRequest":
        host = (urlparse(self.original_url).hostname or "").lower()
        allowed_hosts = {
            "youtube": ("youtube.com", "youtu.be", "youtube-nocookie.com"),
            "tiktok": ("tiktok.com",),
            "facebook": ("facebook.com", "fb.com", "fb.watch"),
        }
        if not any(
            host == domain or host.endswith(f".{domain}") for domain in allowed_hosts[self.provider]
        ):
            raise ValueError("Video URL is not from the approved provider")
        return self


class AdminPaperResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: UUID
    slug: str
    title: str
    status: str
    paper_number: str
    medium: str
    total_marks: Decimal | None = None
    description: str | None = None
    published_at: datetime | None = None


class AdminQuestionResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: UUID
    paper_id: UUID
    number_label: str
    position: int
    prompt_markdown: str
    marks: Decimal


class AdminActionResponse(BaseModel):
    data: dict[str, Any]
