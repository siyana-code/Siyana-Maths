from typing import Protocol

from app.integrations.supabase import SupabaseGateway, SupabasePage


class PaperRepository(Protocol):
    async def list_published(
        self,
        *,
        level: str | None,
        subject: str | None,
        year: int | None,
        paper_number: str | None,
        medium: str | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> SupabasePage: ...


class SupabasePaperRepository:
    def __init__(self, gateway: SupabaseGateway) -> None:
        self.gateway = gateway

    async def list_published(
        self,
        *,
        level: str | None,
        subject: str | None,
        year: int | None,
        paper_number: str | None,
        medium: str | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> SupabasePage:
        return await self.gateway.list_published_papers(
            level=level,
            subject=subject,
            year=year,
            paper_number=paper_number,
            medium=medium,
            query=query,
            page=page,
            page_size=page_size,
        )
