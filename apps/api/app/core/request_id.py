import re
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a safe request ID to every response and request state."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        candidate = request.headers.get("X-Request-ID", "")
        request_id = candidate if _REQUEST_ID_PATTERN.fullmatch(candidate) else uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
