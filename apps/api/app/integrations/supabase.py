from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import Settings


class SupabaseNotConfigured(RuntimeError):
    """Raised when a Supabase operation is requested without public settings."""


class SupabaseRequestError(RuntimeError):
    """Raised when the Supabase REST API cannot satisfy a request."""

    def __init__(self, status_code: int | None, message: str = "Supabase request failed"):
        self.status_code = status_code
        super().__init__(message)


@dataclass(frozen=True)
class SupabaseStatus:
    configured: bool
    reachable: bool | None
    detail: str


@dataclass(frozen=True)
class SupabasePage:
    rows: list[dict[str, Any]]
    total: int


class SupabaseGateway:
    """Small async REST gateway for the public Supabase/PostgREST API.

    The browser may use the public Supabase key for authentication, but all
    privileged domain access remains on this backend. The service-role key is
    optional until admin write endpoints are implemented.
    """

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client
        self._owns_client = client is None

    @property
    def configured(self) -> bool:
        return self.settings.supabase_configured

    def _key(self, *, use_service_role: bool = False) -> str:
        key = (
            self.settings.supabase_service_role_key
            if use_service_role
            else self.settings.supabase_anon_key
        )
        if not key:
            raise SupabaseNotConfigured("Supabase API key is not configured")
        return key

    def _headers(
        self,
        *,
        use_service_role: bool = False,
        prefer_count: bool = False,
    ) -> dict[str, str]:
        key = self._key(use_service_role=use_service_role)
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        }
        if prefer_count:
            headers["Prefer"] = "count=exact"
        return headers

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.settings.supabase_timeout_seconds)
        return self._client

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        use_service_role: bool = False,
        prefer_count: bool = False,
    ) -> httpx.Response:
        if not self.settings.supabase_url:
            raise SupabaseNotConfigured("SUPABASE_URL is not configured")
        url = f"{self.settings.supabase_url.rstrip('/')}{path}"
        client = await self._get_client()
        try:
            response = await client.request(
                method,
                url,
                params=params,
                json=json,
                headers=self._headers(
                    use_service_role=use_service_role,
                    prefer_count=prefer_count,
                ),
            )
        except httpx.HTTPError as exc:
            raise SupabaseRequestError(None, "Supabase is unreachable") from exc
        if response.is_error:
            raise SupabaseRequestError(response.status_code)
        return response

    async def ping(self) -> SupabaseStatus:
        if not self.configured:
            return SupabaseStatus(False, None, "not_configured")
        try:
            response = await self.request("GET", "/rest/v1/")
        except SupabaseNotConfigured:
            return SupabaseStatus(False, None, "not_configured")
        except SupabaseRequestError as exc:
            return SupabaseStatus(True, False, str(exc))
        if response.is_error:
            return SupabaseStatus(True, False, f"http_{response.status_code}")
        return SupabaseStatus(True, True, "ok")

    async def list_published_papers(
        self,
        *,
        level: str | None = None,
        subject: str | None = None,
        year: int | None = None,
        paper_number: str | None = None,
        medium: str | None = None,
        query: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> SupabasePage:
        params: dict[str, Any] = {
            "select": (
                "id,slug,title,description,paper_number,medium,total_marks,published_at,"
                "level:exam_levels(slug,name_en),subject:subjects(slug,name_en),"
                "exam_year:exam_years(year)"
            ),
            "status": "eq.published",
            "order": "published_at.desc",
            "offset": (page - 1) * page_size,
            "limit": page_size,
        }
        if level:
            params["exam_levels.slug"] = f"eq.{level}"
        if subject:
            params["subjects.slug"] = f"eq.{subject}"
        if year is not None:
            params["exam_years.year"] = f"eq.{year}"
        if paper_number:
            params["paper_number"] = f"eq.{paper_number}"
        if medium:
            params["medium"] = f"eq.{medium}"
        if query:
            params["or"] = f"(title.ilike.*%{query}%,description.ilike.*%{query}%)"

        response = await self.request("GET", "/rest/v1/papers", params=params, prefer_count=True)
        try:
            rows = response.json()
        except ValueError as exc:
            raise SupabaseRequestError(
                response.status_code,
                "Supabase returned invalid JSON",
            ) from exc
        if not isinstance(rows, list):
            raise SupabaseRequestError(response.status_code, "Supabase returned an invalid list")

        total = len(rows)
        content_range = response.headers.get("Content-Range", "")
        if "/" in content_range:
            candidate = content_range.rsplit("/", 1)[1]
            if candidate.isdigit():
                total = int(candidate)
        return SupabasePage(rows=rows, total=total)

    async def close(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None
