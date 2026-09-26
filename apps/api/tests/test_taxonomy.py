from typing import Any

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


class FakeTaxonomyGateway:
    async def list_taxonomy(self) -> dict[str, list[dict[str, Any]]]:
        return {
            "levels": [{"id": "level-1", "slug": "ordinary-level", "name_en": "Ordinary Level"}],
            "subjects": [{"id": "subject-1", "slug": "mathematics", "name_en": "Mathematics"}],
            "exam_years": [{"id": "year-1", "year": 2025}],
            "topics": [],
        }

    async def close(self) -> None:
        return None


def test_taxonomy_returns_reference_data() -> None:
    settings = Settings(
        app_env="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="public-key",
        allowed_origins="http://localhost:3000",
    )
    app = create_app(settings=settings, supabase_gateway=FakeTaxonomyGateway())
    with TestClient(app) as client:
        response = client.get("/api/v1/taxonomy")

    assert response.status_code == 200
    body = response.json()
    assert body["levels"][0]["slug"] == "ordinary-level"
    assert body["subjects"][0]["slug"] == "mathematics"
    assert body["exam_years"][0]["year"] == 2025
