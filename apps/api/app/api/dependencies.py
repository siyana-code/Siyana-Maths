from dataclasses import dataclass
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.auth import SupabaseAuthError
from app.integrations.supabase import SupabaseNotConfigured, SupabaseRequestError

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AdminPrincipal:
    id: UUID
    display_name: str
    role: str


def _unauthorized(message: str = "Authentication is required.") -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"code": "authentication_required", "message": message, "details": None},
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> AdminPrincipal:
    if credentials is None or not credentials.credentials:
        raise _unauthorized()

    settings = request.app.state.settings
    if not settings.supabase_write_configured:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "admin_integration_not_configured",
                "message": "Admin authentication is not configured.",
                "details": None,
            },
        )

    try:
        verified = await request.app.state.auth_verifier.verify(credentials.credentials)
    except SupabaseAuthError as exc:
        raise _unauthorized("The access token is invalid or expired.") from exc

    try:
        user_id = UUID(verified.subject)
    except ValueError as exc:
        raise _unauthorized("The access token subject is invalid.") from exc

    try:
        profile: dict[str, Any] | None = await request.app.state.supabase.get_profile(str(user_id))
    except SupabaseNotConfigured as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "admin_integration_not_configured",
                "message": "The Supabase admin integration is not configured.",
                "details": None,
            },
        ) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "admin_profile_unavailable",
                "message": "The admin profile could not be loaded.",
                "details": {"upstream_status": exc.status_code},
            },
        ) from exc

    if not profile or profile.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "admin_role_required",
                "message": "An administrator role is required.",
                "details": None,
            },
        )

    return AdminPrincipal(
        id=user_id,
        display_name=str(profile.get("display_name") or "Administrator"),
        role="admin",
    )
