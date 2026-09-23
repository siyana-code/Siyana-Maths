from datetime import UTC, datetime

from fastapi import APIRouter, Request, Response

from app.core.config import Settings
from app.models.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])


def _service_name() -> str:
    return "siyana-maths-api"


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings: Settings = request.app.state.settings
    return HealthResponse(
        service=_service_name(),
        version=settings.api_version,
        environment=settings.app_env,
        timestamp=datetime.now(UTC),
    )


@router.get("/ready", response_model=ReadinessResponse)
async def readiness(
    request: Request,
    response: Response,
    check_supabase: bool = False,
) -> ReadinessResponse:
    settings: Settings = request.app.state.settings
    gateway = request.app.state.supabase
    status = await gateway.ping() if check_supabase else None

    if status is None:
        configured = settings.supabase_configured
        reachable = None
        detail = "not_checked"
    else:
        configured = status.configured
        reachable = status.reachable
        detail = status.detail

    degraded = not configured or reachable is False
    if settings.app_env == "production" and degraded:
        response.status_code = 503

    return ReadinessResponse(
        status="degraded" if degraded else "ok",
        service=_service_name(),
        version=settings.api_version,
        environment=settings.app_env,
        timestamp=datetime.now(UTC),
        supabase={
            "configured": configured,
            "reachable": reachable,
            "detail": detail,
        },
    )
