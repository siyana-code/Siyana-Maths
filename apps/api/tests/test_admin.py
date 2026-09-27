from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.auth import VerifiedSupabaseToken
from app.core.config import Settings
from app.main import create_app

ADMIN_ID = UUID("00000000-0000-0000-0000-000000000001")
PAPER_ID = UUID("00000000-0000-0000-0000-000000000010")
PART_A_ID = UUID("00000000-0000-0000-0000-0000000000a1")
PART_B_ID = UUID("00000000-0000-0000-0000-0000000000b1")
QUESTION_ID = UUID("00000000-0000-0000-0000-000000000011")


def _part(
    part_id: UUID,
    part_code: str,
    title: str,
    part_type: str,
    question_count: int,
    selection_limit: int,
    marks_per_question: str,
    total_marks: str,
    sort_order: int,
) -> dict[str, Any]:
    return {
        "id": str(part_id),
        "paper_id": str(PAPER_ID),
        "part_code": part_code,
        "title": title,
        "part_type": part_type,
        "question_count": question_count,
        "selection_limit": selection_limit,
        "marks_per_question": marks_per_question,
        "total_marks": total_marks,
        "sort_order": sort_order,
    }


def _sort_key(value: Any) -> tuple[int, Any]:
    """Sort numbers numerically and everything else as text, like Postgres would."""
    if isinstance(value, bool) or value is None:
        return (0, str(value))
    if isinstance(value, (int, float)):
        return (1, value)
    if isinstance(value, str) and value.lstrip("-").isdigit():
        return (1, Decimal(value))
    return (2, str(value))


def _paper_one_questions() -> list[dict[str, Any]]:
    """A complete Paper I: 25 short (2 marks) + 5 structured (10 marks)."""
    questions: list[dict[str, Any]] = []
    for index in range(1, 26):
        questions.append(
            {
                "id": str(uuid4()),
                "paper_id": str(PAPER_ID),
                "part_id": str(PART_A_ID),
                "number_label": str(index),
                "position": index,
                "prompt_markdown": f"Short question {index}",
                "marks": "2",
            }
        )
    for index in range(1, 6):
        questions.append(
            {
                "id": str(uuid4()),
                "paper_id": str(PAPER_ID),
                "part_id": str(PART_B_ID),
                "number_label": str(index),
                "position": index,
                "prompt_markdown": f"Structured question {index}",
                "marks": "10",
            }
        )
    return questions


class FakeVerifier:
    async def verify(self, token: str) -> VerifiedSupabaseToken:
        if token != "valid-token":
            from app.core.auth import SupabaseAuthError

            raise SupabaseAuthError("invalid test token")
        return VerifiedSupabaseToken(subject=str(ADMIN_ID), claims={"sub": str(ADMIN_ID)})

    async def close(self) -> None:
        return None


class FakeAdminGateway:
    def __init__(self, role: str = "admin", *, complete: bool = True) -> None:
        self.role = role
        self.paper: dict[str, Any] = {
            "id": str(PAPER_ID),
            "slug": "ol-mathematics-paper-i",
            "title": "O/L Mathematics Paper I",
            "status": "draft",
            "paper_number": "I",
            "medium": "si",
            "total_marks": "100",
        }
        self.parts = [
            _part(PART_A_ID, "A", "Part A — Short questions", "short", 25, 25, "2", "50", 1),
            _part(
                PART_B_ID,
                "B",
                "Part B — Structured questions",
                "structured",
                5,
                5,
                "10",
                "50",
                2,
            ),
        ]
        self.questions = _paper_one_questions() if complete else []
        self.answers = [
            {
                "id": uuid4().hex,
                "question_id": str(question["id"]),
                "solution_markdown": "සොලුමා ගලනය",
            }
            for question in self.questions
        ]
        self.marking_items = [
            {
                "id": uuid4().hex,
                "question_id": str(question["id"]),
                "position": 1,
                "item_type": "method",
                "criterion_markdown": "Step",
                "mark_value": question["marks"],
                "is_alternative": False,
            }
            for question in self.questions
        ]
        self.videos = [{"id": uuid4().hex, "paper_id": str(PAPER_ID), "question_id": None}]

    @staticmethod
    def _table_path(table: str) -> str:
        return f"/rest/v1/{table}"

    async def get_profile(self, user_id: str) -> dict[str, Any] | None:
        return {"id": user_id, "display_name": "Test Admin", "role": self.role}

    async def insert_row(
        self, table: str, payload: dict[str, Any], **kwargs: Any
    ) -> dict[str, Any]:
        if table == "papers":
            assert payload.get("slug")
            return {**payload, "id": str(PAPER_ID), "status": "draft"}
        return {**payload, "id": uuid4().hex}

    async def update_row(
        self, table: str, row_id: str, payload: dict[str, Any], **kwargs: Any
    ) -> dict[str, Any]:
        self.paper.update(payload)
        return self.paper

    async def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        rows: list[dict[str, Any]] = []
        if path.endswith("/papers"):
            rows = [self.paper]
        elif path.endswith("/paper_parts"):
            rows = self.parts
        elif path.endswith("/questions"):
            rows = self.questions
        elif path.endswith("/answers"):
            rows = self.answers
        elif path.endswith("/marking_scheme_items"):
            rows = self.marking_items
        elif path.endswith("/video_sources"):
            rows = self.videos
        else:
            return httpx.Response(200, json=[])

        params = kwargs.get("params") or {}
        for column, value in params.items():
            if not isinstance(value, str) or not value.startswith("eq."):
                continue
            expected = value[3:]
            rows = [row for row in rows if str(row.get(column)) == expected]

        order = params.get("order")
        if isinstance(order, str) and order:
            for clause in reversed(order.split(",")):
                column, _, direction = clause.strip().partition(".")
                rows.sort(
                    key=lambda row: _sort_key(row.get(column)),
                    reverse=direction.strip() == "desc",
                )

        limit = params.get("limit")
        if isinstance(limit, str) and limit.isdigit():
            rows = rows[: int(limit)]

        return httpx.Response(200, json=rows)

    async def ping(self):
        from app.integrations.supabase import SupabaseStatus

        return SupabaseStatus(True, True, "ok")

    async def close(self) -> None:
        return None


def admin_settings() -> Settings:
    return Settings(
        app_env="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="public-key",
        supabase_service_role_key="service-key",
        allowed_origins="http://localhost:3000",
    )


def admin_client(gateway: FakeAdminGateway | None = None) -> TestClient:
    app = create_app(
        settings=admin_settings(),
        supabase_gateway=gateway or FakeAdminGateway(),
        auth_verifier=FakeVerifier(),
    )
    return TestClient(app)


def test_admin_routes_require_bearer_token() -> None:
    with admin_client() as client:
        response = client.get("/api/v1/admin/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


def test_admin_me_returns_profile_role() -> None:
    with admin_client() as client:
        response = client.get(
            "/api/v1/admin/me",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(ADMIN_ID),
        "display_name": "Test Admin",
        "role": "admin",
    }


def test_non_admin_profile_is_forbidden() -> None:
    with admin_client(FakeAdminGateway(role="student")) as client:
        response = client.get(
            "/api/v1/admin/me",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "admin_role_required"


def test_admin_lists_papers_for_workspace() -> None:
    with admin_client() as client:
        response = client.get(
            "/api/v1/admin/papers?status=draft",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 200
    assert response.json()["meta"] == {"page": 1, "page_size": 20, "total": 1}
    assert response.json()["data"][0]["status"] == "draft"


def test_admin_can_create_draft_paper() -> None:
    with admin_client() as client:
        response = client.post(
            "/api/v1/admin/papers",
            headers={"Authorization": "Bearer valid-token"},
            json={
                "title": "O/L Mathematics 2025 Paper I",
                "level_id": str(uuid4()),
                "subject_id": str(uuid4()),
                "exam_year_id": str(uuid4()),
                "paper_number": "I",
                "medium": "si",
            },
        )

    assert response.status_code == 201
    assert response.json()["data"]["status"] == "draft"


def test_publish_validates_paper_before_publishing() -> None:
    with admin_client() as client:
        response = client.post(
            f"/api/v1/admin/papers/{PAPER_ID}/publish",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "published"
    assert response.json()["data"]["total_marks"] in ("100", 100, "100.00")


def test_publish_requires_complete_parts() -> None:
    with admin_client(FakeAdminGateway(complete=False)) as client:
        response = client.post(
            f"/api/v1/admin/papers/{PAPER_ID}/publish",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "paper_validation_failed"
    reasons = {item["reason"] for item in payload["error"]["details"]["errors"]}
    assert "question_count_mismatch" in reasons
    assert "at_least_one_question_required" in reasons


def test_paper_bundle_includes_parts() -> None:
    with admin_client() as client:
        response = client.get(
            f"/api/v1/admin/papers/{PAPER_ID}",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 200
    parts = response.json()["data"]["parts"]
    assert [
        (part["part_code"], part["question_count"], part["selection_limit"]) for part in parts
    ] == [
        ("A", 25, 25),
        ("B", 5, 5),
    ]


def test_question_requires_part_id() -> None:
    with admin_client() as client:
        response = client.post(
            f"/api/v1/admin/papers/{PAPER_ID}/questions",
            headers={"Authorization": "Bearer valid-token"},
            json={
                "number_label": "1",
                "prompt_markdown": "ප්‍රශ්නය",
                "marks": 2,
            },
        )

    assert response.status_code == 422


def test_question_rejects_marks_that_break_part_config() -> None:
    with admin_client() as client:
        response = client.post(
            f"/api/v1/admin/papers/{PAPER_ID}/questions",
            headers={"Authorization": "Bearer valid-token"},
            json={
                "part_id": str(PART_A_ID),
                "number_label": "99",
                "prompt_markdown": "ප්‍රශ්නය",
                "marks": 2,
            },
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "question_limit_reached"


def test_question_rejects_part_from_another_paper() -> None:
    with admin_client() as client:
        response = client.post(
            f"/api/v1/admin/papers/{PAPER_ID}/questions",
            headers={"Authorization": "Bearer valid-token"},
            json={
                "part_id": str(uuid4()),
                "number_label": "1",
                "prompt_markdown": "ප්‍රශ්නය",
                "marks": 2,
            },
        )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "paper_part_not_found"


def test_video_url_provider_allowlist() -> None:
    from pydantic import ValidationError

    from app.models.admin import VideoSourceCreateRequest

    with pytest.raises(ValidationError):
        VideoSourceCreateRequest(
            provider="youtube",
            original_url="https://example.com/not-youtube",
        )

    source = VideoSourceCreateRequest(
        provider="youtube",
        original_url="https://www.youtube.com/watch?v=abc123",
    )
    assert source.provider == "youtube"
