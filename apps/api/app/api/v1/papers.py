from fastapi import APIRouter, HTTPException, Query, Request

from app.integrations.supabase import SupabaseNotConfigured, SupabaseRequestError
from app.models.papers import PaperListResponse, PaperSummary
from app.repositories.papers import SupabasePaperRepository

router = APIRouter(prefix="/papers", tags=["papers"])


@router.get("", response_model=PaperListResponse)
async def list_papers(
    request: Request,
    level: str | None = Query(default=None, max_length=64),
    subject: str | None = Query(default=None, max_length=64),
    year: int | None = Query(default=None, ge=1900, le=2200),
    paper_number: str | None = Query(default=None, max_length=20),
    medium: str | None = Query(default=None, pattern="^(en|si|ta)$"),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
) -> PaperListResponse:
    repository = SupabasePaperRepository(request.app.state.supabase)
    try:
        result = await repository.list_published(
            level=level,
            subject=subject,
            year=year,
            paper_number=paper_number,
            medium=medium,
            query=q,
            page=page,
            page_size=page_size,
        )
    except SupabaseNotConfigured as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "supabase_not_configured",
                "message": "The Supabase integration is not configured.",
                "details": {"missing": str(exc)},
            },
        ) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "supabase_request_failed",
                "message": "The content service is temporarily unavailable.",
                "details": {"upstream_status": exc.status_code},
            },
        ) from exc

    return PaperListResponse(
        data=[PaperSummary.model_validate(row) for row in result.rows],
        meta={"page": page, "page_size": page_size, "total": result.total},
    )
