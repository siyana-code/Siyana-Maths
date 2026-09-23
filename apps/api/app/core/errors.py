import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def install_exception_handlers(app: FastAPI) -> None:
    """Return stable, non-sensitive error envelopes for API clients."""

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "The request could not be validated.",
                    "details": jsonable_encoder(exc.errors()),
                },
                "request_id": _request_id(request),
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException):
        detail: Any = exc.detail
        if isinstance(detail, dict):
            code = str(detail.get("code", "http_error"))
            message = str(detail.get("message", "The request could not be completed."))
            details = detail.get("details")
        else:
            code = "http_error"
            message = str(detail)
            details = None
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": message,
                    "details": jsonable_encoder(details),
                },
                "request_id": _request_id(request),
            },
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        logger.exception("Unhandled application error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_server_error",
                    "message": "An unexpected server error occurred.",
                    "details": None,
                },
                "request_id": _request_id(request),
            },
        )
