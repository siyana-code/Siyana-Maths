from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.integrations.supabase import SupabaseGateway
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    return Settings(
        app_env="test",
        api_version="0.1.0",
        allowed_origins="http://localhost:3000",
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    app = create_app(settings=settings, supabase_gateway=SupabaseGateway(settings))
    with TestClient(app) as test_client:
        yield test_client
