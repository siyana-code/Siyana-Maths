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
        prefer_returning: bool = False,
        prefer_resolution: bool = False,
    ) -> dict[str, str]:
        key = self._key(use_service_role=use_service_role)
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        }
        if prefer_count:
            headers["Prefer"] = "count=exact"
        if prefer_returning:
            headers["Prefer"] = (
                "resolution=merge-duplicates,return=representation"
                if prefer_resolution
                else "return=representation"
            )
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
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        use_service_role: bool = False,
        prefer_count: bool = False,
        prefer_returning: bool = False,
        prefer_resolution: bool = False,
    ) -> httpx.Response:
        if not self.settings.supabase_url:
            raise SupabaseNotConfigured("SUPABASE_URL is not configured")
        url = f"{self.settings.supabase_url.rstrip('/')}{path}"
        client = await self._get_client()
        request_headers = self._headers(
            use_service_role=use_service_role,
            prefer_count=prefer_count,
            prefer_returning=prefer_returning,
            prefer_resolution=prefer_resolution,
        )
        if headers:
            request_headers.update(headers)
        try:
            response = await client.request(
                method,
                url,
                params=params,
                json=json,
                content=content,
                headers=request_headers,
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
            response = await self.request(
                "GET",
                "/rest/v1/exam_levels",
                params={"select": "id", "limit": 1},
            )
        except SupabaseNotConfigured:
            return SupabaseStatus(False, None, "not_configured")
        except SupabaseRequestError as exc:
            return SupabaseStatus(True, False, str(exc))
        if response.is_error:
            return SupabaseStatus(True, False, f"http_{response.status_code}")
        return SupabaseStatus(True, True, "ok")

    async def list_taxonomy(self) -> dict[str, list[dict[str, Any]]]:
        async def read(table: str, params: dict[str, Any]) -> list[dict[str, Any]]:
            response = await self.request("GET", self._table_path(table), params=params)
            rows = response.json()
            if not isinstance(rows, list):
                raise SupabaseRequestError(
                    response.status_code, "Supabase returned an invalid list"
                )
            return rows

        return {
            "levels": await read(
                "exam_levels",
                {"select": "id,slug,name_en,name_si,sort_order", "order": "sort_order.asc"},
            ),
            "subjects": await read(
                "subjects",
                {"select": "id,slug,name_en,name_si,sort_order", "order": "sort_order.asc"},
            ),
            "exam_years": await read("exam_years", {"select": "id,year", "order": "year.desc"}),
            "topics": await read(
                "topics",
                {
                    "select": "id,subject_id,parent_id,slug,name_en,name_si,is_active",
                    "order": "name_en.asc",
                },
            ),
        }

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

    @staticmethod
    def _table_path(table: str) -> str:
        if not table.replace("_", "").isalnum():
            raise ValueError("Invalid Supabase table name")
        return f"/rest/v1/{table}"

    async def insert_row(
        self,
        table: str,
        payload: dict[str, Any],
        *,
        use_service_role: bool = True,
        on_conflict: str | None = None,
    ) -> dict[str, Any]:
        params = {"onConflict": on_conflict} if on_conflict else None
        response = await self.request(
            "POST",
            self._table_path(table),
            params=params,
            json=payload,
            use_service_role=use_service_role,
            prefer_returning=True,
            prefer_resolution=on_conflict is not None,
        )
        rows = response.json()
        if not isinstance(rows, list) or not rows:
            raise SupabaseRequestError(response.status_code, "Supabase insert returned no row")
        return rows[0]

    async def update_row(
        self,
        table: str,
        row_id: str,
        payload: dict[str, Any],
        *,
        use_service_role: bool = True,
    ) -> dict[str, Any]:
        response = await self.request(
            "PATCH",
            self._table_path(table),
            params={"id": f"eq.{row_id}"},
            json=payload,
            use_service_role=use_service_role,
            prefer_returning=True,
        )
        rows = response.json()
        if not isinstance(rows, list) or not rows:
            raise SupabaseRequestError(response.status_code, "Supabase update returned no row")
        return rows[0]

    async def get_profile(self, user_id: str) -> dict[str, Any] | None:
        response = await self.request(
            "GET",
            self._table_path("profiles"),
            params={"id": f"eq.{user_id}", "select": "id,display_name,role", "limit": 1},
            use_service_role=True,
        )
        rows = response.json()
        if not isinstance(rows, list):
            raise SupabaseRequestError(response.status_code, "Supabase returned an invalid profile")
        return rows[0] if rows else None

    # ---------------------------------------------------------------- storage

    def _storage_object_path(self, bucket: str, object_path: str) -> str:
        if not bucket.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Invalid storage bucket name")
        if not object_path or object_path.startswith("/") or ".." in object_path:
            raise ValueError("Invalid storage object path")
        return f"/storage/v1/object/{bucket}/{object_path}"

    def storage_public_url(self, bucket: str, object_path: str) -> str:
        if not self.settings.supabase_url:
            raise SupabaseNotConfigured("SUPABASE_URL is not configured")
        base = self.settings.supabase_url.rstrip("/")
        return f"{base}/storage/v1/object/public/{bucket}/{object_path}"

    async def upload_object(
        self,
        *,
        bucket: str,
        object_path: str,
        body: bytes,
        content_type: str,
    ) -> dict[str, Any]:
        response = await self.request(
            "POST",
            self._storage_object_path(bucket, object_path),
            content=body,
            headers={"Content-Type": content_type, "x-upsert": "false"},
            use_service_role=True,
            prefer_returning=True,
        )
        payload = response.json()
        return payload if isinstance(payload, dict) else {}

    async def delete_object(self, *, bucket: str, object_path: str) -> None:
        await self.request(
            "DELETE",
            self._storage_object_path(bucket, object_path),
            use_service_role=True,
        )

    async def close(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None
