from fastapi.testclient import TestClient


def test_health_is_public_and_has_request_id(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "test-request-123"})

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["environment"] == "test"
    assert response.headers["X-Request-ID"] == "test-request-123"


def test_invalid_request_id_is_replaced(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "not a safe id"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] != "not a safe id"


def test_readiness_degrades_without_supabase(client: TestClient) -> None:
    response = client.get("/ready")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["supabase"] == {
        "configured": False,
        "reachable": None,
        "detail": "not_checked",
    }


def test_cors_allows_configured_origin(client: TestClient) -> None:
    response = client.options(
        "/api/v1/papers",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
