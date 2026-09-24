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
QUESTION_ID = UUID("00000000-0000-0000-0000-000000000011")


class FakeVerifier:
    async def verify(self, token: str) -> VerifiedSupabaseToken:
        if token != "valid-token":
            from app.core.auth import SupabaseAuthError

            raise SupabaseAuthError("invalid test token")
        return VerifiedSupabaseToken(subject=str(ADMIN_ID), claims={"sub": str(ADMIN_ID)})

    async def close(self) -> None:
        return None


class FakeAdminGateway:
    def __init__(self, role: str = "admin") -> None:
        self.role = role
        self.paper: dict[str, Any] = {
            "id": str(PAPER_ID),
            "slug": "ol-mathematics-paper-i",
            "title": "O/L Mathematics Paper I",
            "status": "draft",
            "paper_number": "I",
            "medium": "si",
            "marks": None,
        }
        self.questions = [
            {
                "id": str(QUESTION_ID),
                "paper_id": str(PAPER_ID),
                "number_label": "1",
                "position": 1,
                "prompt_markdown": "Question",
                "marks": "5",
            }
        ]
        self.answers = [
            {"id": uuid4().hex, "question_id": str(QUESTION_ID), "solution_markdown": "Solution"}
        ]
        self.marking_items = [
            {
                "id": uuid4().hex,
                "question_id": str(QUESTION_ID),
                "position": 1,
                "item_type": "method",
                "mark_value": "5",
                "is_alternative": False,
            }
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
            return {**payload, "id": str(PAPER_ID), "slug": "new-paper", "status": "draft"}
        return {**payload, "id": uuid4().hex}

    async def update_row(
        self, table: str, row_id: str, payload: dict[str, Any], **kwargs: Any
    ) -> dict[str, Any]:
        self.paper.update(payload)
        return self.paper

    async def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        if path.endswith("/papers"):
            return httpx.Response(200, json=[self.paper])
        if path.endswith("/questions"):
            return httpx.Response(200, json=self.questions)
        if path.endswith("/answers"):
            return httpx.Response(200, json=self.answers)
        if path.endswith("/marking_scheme_items"):
            return httpx.Response(200, json=self.marking_items)
        if path.endswith("/video_sources"):
            return httpx.Response(200, json=self.videos)
        return httpx.Response(200, json=[])

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
