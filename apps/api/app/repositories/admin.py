from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from app.integrations.supabase import SupabaseGateway, SupabaseNotConfigured, SupabaseRequestError
from app.models.admin import (
    AnswerUpsertRequest,
    MarkingItemCreateRequest,
    PaperCreateRequest,
    PaperPatchRequest,
    QuestionCreateRequest,
    VideoSourceCreateRequest,
)


class AdminRepositoryError(RuntimeError):
    def __init__(self, code: str, message: str, status_code: int = 400, details: Any = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class SupabaseAdminRepository:
    def __init__(self, gateway: SupabaseGateway) -> None:
        self.gateway = gateway

    async def _rows(
        self,
        table: str,
        params: dict[str, Any],
        *,
        service_role: bool = True,
    ) -> list[dict[str, Any]]:
        try:
            response = await self.gateway.request(
                "GET",
                self.gateway._table_path(table),
                params=params,
                use_service_role=service_role,
            )
        except SupabaseNotConfigured as exc:
            raise AdminRepositoryError(
                "supabase_not_configured",
                "The Supabase admin integration is not configured.",
                503,
            ) from exc
        except SupabaseRequestError as exc:
            raise AdminRepositoryError(
                "supabase_request_failed",
                "The content service could not complete the request.",
                502,
                {"upstream_status": exc.status_code},
            ) from exc
        rows = response.json()
        if not isinstance(rows, list):
            raise AdminRepositoryError(
                "invalid_supabase_response",
                "The content service returned an invalid response.",
                502,
            )
        return rows

    async def get_paper(
        self, paper_id: UUID, *, service_role: bool = True
    ) -> dict[str, Any] | None:
        rows = await self._rows(
            "papers",
            {"id": f"eq.{paper_id}", "limit": 1},
            service_role=service_role,
        )
        return rows[0] if rows else None

    async def create_paper(self, payload: PaperCreateRequest, admin_id: UUID) -> dict[str, Any]:
        body = payload.model_dump(mode="json", exclude_none=True)
        body.update({"status": "draft", "created_by": str(admin_id), "updated_by": str(admin_id)})
        try:
            return await self.gateway.insert_row("papers", body, use_service_role=True)
        except SupabaseNotConfigured as exc:
            raise AdminRepositoryError(
                "supabase_not_configured", "Supabase is not configured.", 503
            ) from exc
        except SupabaseRequestError as exc:
            raise AdminRepositoryError(
                "paper_create_failed",
                "The paper could not be created.",
                502,
                {"upstream_status": exc.status_code},
            ) from exc

    async def update_paper(
        self,
        paper_id: UUID,
        payload: PaperPatchRequest,
        admin_id: UUID,
    ) -> dict[str, Any]:
        body = payload.model_dump(mode="json", exclude_unset=True, exclude_none=True)
        if not body:
            raise AdminRepositoryError("empty_update", "At least one paper field is required.")
        body["updated_by"] = str(admin_id)
        try:
            return await self.gateway.update_row(
                "papers", str(paper_id), body, use_service_role=True
            )
        except SupabaseNotConfigured as exc:
            raise AdminRepositoryError(
                "supabase_not_configured", "Supabase is not configured.", 503
            ) from exc
        except SupabaseRequestError as exc:
            raise AdminRepositoryError(
                "paper_update_failed",
                "The paper could not be updated.",
                502,
                {"upstream_status": exc.status_code},
            ) from exc

    async def _next_position(self, table: str, parent_column: str, parent_id: UUID) -> int:
        rows = await self._rows(
            table,
            {
                parent_column: f"eq.{parent_id}",
                "select": "position",
                "order": "position.desc",
                "limit": 1,
            },
        )
        return int(rows[0]["position"]) + 1 if rows else 1

    async def create_question(
        self,
        paper_id: UUID,
        payload: QuestionCreateRequest,
        admin_id: UUID,
    ) -> dict[str, Any]:
        paper = await self.get_paper(paper_id)
        if not paper:
            raise AdminRepositoryError("paper_not_found", "Paper not found.", 404)
        body = payload.model_dump(mode="json", exclude_none=True)
        body.update(
            {
                "paper_id": str(paper_id),
                "position": body.get("position")
                or await self._next_position("questions", "paper_id", paper_id),
            }
        )
        try:
            return await self.gateway.insert_row("questions", body, use_service_role=True)
        except SupabaseRequestError as exc:
            raise AdminRepositoryError(
                "question_create_failed",
                "The question could not be created.",
                409,
                {"upstream_status": exc.status_code},
            ) from exc

    async def upsert_answer(
        self, question_id: UUID, payload: AnswerUpsertRequest
    ) -> dict[str, Any]:
        body = payload.model_dump(mode="json")
        body["question_id"] = str(question_id)
        try:
            return await self.gateway.insert_row(
                "answers",
                body,
                use_service_role=True,
                on_conflict="question_id",
            )
        except SupabaseRequestError as exc:
            raise AdminRepositoryError(
                "answer_save_failed",
                "The answer could not be saved.",
                409,
                {"upstream_status": exc.status_code},
            ) from exc

    async def create_marking_item(
        self,
        question_id: UUID,
        payload: MarkingItemCreateRequest,
    ) -> dict[str, Any]:
        body = payload.model_dump(mode="json", exclude_none=True)
        body.update(
            {
                "question_id": str(question_id),
                "position": body.get("position")
                or await self._next_position("marking_scheme_items", "question_id", question_id),
            }
        )
        try:
            return await self.gateway.insert_row(
                "marking_scheme_items", body, use_service_role=True
            )
        except SupabaseRequestError as exc:
            raise AdminRepositoryError(
                "marking_item_create_failed",
                "The marking-scheme item could not be created.",
                409,
                {"upstream_status": exc.status_code},
            ) from exc

    async def create_video_source(
        self,
        paper_id: UUID,
        payload: VideoSourceCreateRequest,
    ) -> dict[str, Any]:
        paper = await self.get_paper(paper_id)
        if not paper:
            raise AdminRepositoryError("paper_not_found", "Paper not found.", 404)
        body = payload.model_dump(mode="json", exclude_none=True)
        body.update(
            {
                "paper_id": str(paper_id),
                "position": await self._next_position("video_sources", "paper_id", paper_id),
            }
        )
        try:
            return await self.gateway.insert_row("video_sources", body, use_service_role=True)
        except SupabaseRequestError as exc:
            raise AdminRepositoryError(
                "video_source_create_failed",
                "The video source could not be created.",
                409,
                {"upstream_status": exc.status_code},
            ) from exc

    async def get_paper_bundle(self, paper_id: UUID) -> dict[str, Any]:
        paper = await self.get_paper(paper_id)
        if not paper:
            raise AdminRepositoryError("paper_not_found", "Paper not found.", 404)
        questions = await self._rows(
            "questions",
            {"paper_id": f"eq.{paper_id}", "order": "position.asc"},
        )
        question_ids = [str(question["id"]) for question in questions]
        answers: list[dict[str, Any]] = []
        marking_items: list[dict[str, Any]] = []
        if question_ids:
            joined_ids = ",".join(question_ids)
            answers = await self._rows("answers", {"question_id": f"in.({joined_ids})"})
            marking_items = await self._rows(
                "marking_scheme_items",
                {"question_id": f"in.({joined_ids})", "order": "position.asc"},
            )
        videos = await self._rows(
            "video_sources", {"paper_id": f"eq.{paper_id}", "order": "position.asc"}
        )
        return {
            "paper": paper,
            "questions": questions,
            "answers": answers,
            "marking_scheme_items": marking_items,
            "video_sources": videos,
        }

    async def publish_paper(self, paper_id: UUID, admin_id: UUID) -> dict[str, Any]:
        bundle = await self.get_paper_bundle(paper_id)
        paper = bundle["paper"]
        if paper.get("status") == "published":
            raise AdminRepositoryError(
                "paper_already_published", "Paper is already published.", 409
            )
        questions = bundle["questions"]
        answers_by_question = {str(row["question_id"]): row for row in bundle["answers"]}
        items_by_question: dict[str, list[dict[str, Any]]] = {}
        for item in bundle["marking_scheme_items"]:
            items_by_question.setdefault(str(item["question_id"]), []).append(item)
        videos = bundle["video_sources"]
        errors: list[dict[str, Any]] = []
        total_marks = Decimal("0")
        for question in questions:
            question_id = str(question["id"])
            question_marks = Decimal(str(question["marks"]))
            total_marks += question_marks
            if question_id not in answers_by_question:
                errors.append({"question_id": question_id, "reason": "answer_required"})
            items = items_by_question.get(question_id, [])
            if not items:
                errors.append({"question_id": question_id, "reason": "marking_scheme_required"})
                continue
            awarded = sum(
                (
                    Decimal(str(item["mark_value"]))
                    for item in items
                    if not item.get("is_alternative") and item.get("item_type") != "alternative"
                ),
                Decimal("0"),
            )
            if awarded != question_marks:
                errors.append(
                    {
                        "question_id": question_id,
                        "reason": "mark_total_mismatch",
                        "question_marks": str(question_marks),
                        "scheme_marks": str(awarded),
                    }
                )
        if not questions:
            errors.append({"reason": "at_least_one_question_required"})
        if not videos:
            errors.append({"reason": "at_least_one_video_required"})
        if errors:
            raise AdminRepositoryError(
                "paper_validation_failed",
                "The paper is not ready to publish.",
                422,
                {"errors": errors},
            )

        return await self.update_paper(
            paper_id,
            PaperPatchRequest(total_marks=total_marks),
            admin_id,
        ) | {
            "status": "published",
            "published_at": datetime.now(UTC).isoformat(),
        }
