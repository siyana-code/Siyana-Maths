from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import install_exception_handlers
from app.core.logging import configure_logging
from app.core.request_id import RequestIdMiddleware
from app.integrations.supabase import SupabaseGateway


def create_app(
    settings: Settings | None = None,
    supabase_gateway: SupabaseGateway | None = None,
) -> FastAPI:
    app_settings = settings or get_settings()
    gateway = supabase_gateway or SupabaseGateway(app_settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        configure_logging(app.state.settings)
        yield
        await app.state.supabase.close()

    app = FastAPI(
        title="Siyana Maths API",
        description="API for O/L Mathematics papers, answers, marking schemes, and video links.",
        version=app_settings.api_version,
        lifespan=lifespan,
    )
    app.state.settings = app_settings
    app.state.supabase = gateway

    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    install_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(api_router, prefix=app_settings.api_prefix)
    return app


app = create_app()
