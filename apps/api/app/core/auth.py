import asyncio
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt

from app.core.config import Settings


class SupabaseAuthError(RuntimeError):
    """Raised when a Supabase access token cannot be verified."""


@dataclass(frozen=True)
class VerifiedSupabaseToken:
    subject: str
    claims: dict[str, Any]


class SupabaseJWTVerifier:
    """Verify Supabase Auth access tokens against the project JWKS endpoint."""

    _allowed_algorithms = {"RS256", "RS384", "RS512", "ES256", "ES384", "ES512"}
    _cache_seconds = 300

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client
        self._owns_client = client is None
        self._jwks: dict[str, dict[str, Any]] = {}
        self._jwks_loaded_at = 0.0
        self._jwks_lock = asyncio.Lock()

    @property
    def configured(self) -> bool:
        return bool(self.settings.supabase_url)

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.settings.supabase_timeout_seconds)
        return self._client

    async def _load_jwks(self, *, force: bool = False) -> dict[str, dict[str, Any]]:
        if not self.settings.supabase_url:
            raise SupabaseAuthError("Supabase URL is not configured")
        now = time.monotonic()
        if not force and self._jwks and now - self._jwks_loaded_at < self._cache_seconds:
            return self._jwks

        async with self._jwks_lock:
            now = time.monotonic()
            if not force and self._jwks and now - self._jwks_loaded_at < self._cache_seconds:
                return self._jwks
            url = f"{self.settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            client = await self._get_client()
            try:
                response = await client.get(url)
                response.raise_for_status()
                payload = response.json()
            except (httpx.HTTPError, ValueError) as exc:
                raise SupabaseAuthError("Supabase JWKS could not be loaded") from exc

            keys = payload.get("keys") if isinstance(payload, dict) else None
            if not isinstance(keys, list):
                raise SupabaseAuthError("Supabase JWKS response was invalid")
            indexed = {
                str(key["kid"]): key for key in keys if isinstance(key, dict) and key.get("kid")
            }
            if not indexed:
                raise SupabaseAuthError("Supabase JWKS did not contain a key")
            self._jwks = indexed
            self._jwks_loaded_at = time.monotonic()
            return self._jwks

    async def verify(self, token: str) -> VerifiedSupabaseToken:
        if not token:
            raise SupabaseAuthError("Bearer token is missing")
        try:
            header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError as exc:
            raise SupabaseAuthError("Bearer token header is invalid") from exc

        algorithm = header.get("alg")
        key_id = header.get("kid")
        if algorithm not in self._allowed_algorithms or not key_id:
            raise SupabaseAuthError("Bearer token uses an unsupported signing algorithm")

        keys = await self._load_jwks()
        jwk = keys.get(str(key_id))
        if jwk is None:
            keys = await self._load_jwks(force=True)
            jwk = keys.get(str(key_id))
        if jwk is None:
            raise SupabaseAuthError("Bearer token signing key was not found")

        try:
            signing_key = jwt.PyJWK.from_dict(jwk, algorithm=algorithm).key
            claims = jwt.decode(
                token,
                signing_key,
                algorithms=[algorithm],
                audience=self.settings.supabase_jwt_audience,
                issuer=f"{self.settings.supabase_url.rstrip('/')}/auth/v1",
                options={"require": ["exp", "iat", "sub"]},
            )
        except (jwt.InvalidTokenError, ValueError, TypeError, KeyError) as exc:
            raise SupabaseAuthError("Bearer token verification failed") from exc

        subject = claims.get("sub")
        if not isinstance(subject, str) or not subject:
            raise SupabaseAuthError("Bearer token has no subject")
        return VerifiedSupabaseToken(subject=subject, claims=claims)

    async def close(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None
