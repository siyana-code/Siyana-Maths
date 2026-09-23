from typing import Any

import httpx
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.integrations.supabase import SupabaseGateway, SupabasePage
from app.main import create_app


class FakeGateway:
    async def list_published_papers(self, **kwargs: Any) -> SupabasePage:
        assert kwargs["year"] == 2025
        assert kwargs["page"] == 1
        return SupabasePage(
            rows=[
                {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "slug": "ol-mathematics-2025-paper-i",
                    "title": "O/L Mathematics 2025 Paper I",
                    "description": "Published paper",
                    "paper_number": "I",
                    "medium": "si",
                    "total_marks": "100",
                    "published_at": "2026-01-01T00:00:00Z",
                    "level": {"slug": "ordinary-level", "name_en": "Ordinary Level"},
                    "subject": {"slug": "mathematics", "name_en": "Mathematics"},
                    "exam_year": {"year": 2025},
                }
            ],
            total=1,
        )

    async def ping(self):
        from app.integrations.supabase import SupabaseStatus

        return SupabaseStatus(True, True, "ok")

    async def close(self) -> None:
        return None


def test_public_paper_list_uses_repository() -> None:
    settings = Settings(
        app_env="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="public-anon-key",
        allowed_origins="http://localhost:3000",
    )
    app = create_app(settings=settings, supabase_gateway=FakeGateway())

    with TestClient(app) as client:
        response = client.get("/api/v1/papers?year=2025")

    assert response.status_code == 200
    body = response.json()
    assert body["meta"] == {"page": 1, "page_size": 20, "total": 1}
    assert body["data"][0]["slug"] == "ol-mathematics-2025-paper-i"
    assert body["data"][0]["total_marks"] == "100"


def test_paper_list_returns_service_unavailable_without_supabase(client: TestClient) -> None:
    response = client.get("/api/v1/papers")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "supabase_not_configured"
    assert response.json()["request_id"]


def test_supabase_gateway_uses_published_filter_and_count() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json=[],
            headers={"Content-Range": "0-0/17"},
        )

    settings = Settings(
        app_env="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="public-anon-key",
    )
    gateway = SupabaseGateway(
        settings,
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    import asyncio

    result = asyncio.run(gateway.list_published_papers(year=2025, page=1, page_size=20))
    asyncio.run(gateway.close())

    assert result.total == 17
    assert requests[0].url.params["status"] == "eq.published"
    assert requests[0].url.params["exam_years.year"] == "eq.2025"
    assert requests[0].headers["prefer"] == "count=exact"
    assert requests[0].headers["apikey"] == "public-anon-key"
