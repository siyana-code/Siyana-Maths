import asyncio

import httpx

from app.core.config import Settings
from app.integrations.supabase import SupabaseGateway, SupabaseRequestError


def test_supabase_ping_returns_reachable() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={})

    settings = Settings(
        app_env="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="public-anon-key",
    )
    gateway = SupabaseGateway(
        settings,
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    status = asyncio.run(gateway.ping())
    asyncio.run(gateway.close())

    assert status.configured is True
    assert status.reachable is True
    assert status.detail == "ok"


def test_supabase_ping_sanitizes_upstream_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="internal upstream details")

    settings = Settings(
        app_env="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="public-anon-key",
    )
    gateway = SupabaseGateway(
        settings,
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    status = asyncio.run(gateway.ping())
    asyncio.run(gateway.close())

    assert status.configured is True
    assert status.reachable is False
    assert "internal upstream details" not in status.detail


def test_supabase_request_raises_sanitized_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, text="private database message")

    settings = Settings(
        app_env="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="public-anon-key",
    )
    gateway = SupabaseGateway(
        settings,
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    try:
        asyncio.run(gateway.request("GET", "/rest/v1/papers"))
    except SupabaseRequestError as exc:
        assert exc.status_code == 400
        assert "private database message" not in str(exc)
    else:
        raise AssertionError("Expected SupabaseRequestError")
    finally:
        asyncio.run(gateway.close())
