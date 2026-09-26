from fastapi import APIRouter, HTTPException, Request

from app.integrations.supabase import SupabaseNotConfigured, SupabaseRequestError
from app.models.taxonomy import TaxonomyResponse

router = APIRouter(tags=["taxonomy"])


@router.get("/taxonomy", response_model=TaxonomyResponse)
async def get_taxonomy(request: Request) -> TaxonomyResponse:
    try:
        taxonomy = await request.app.state.supabase.list_taxonomy()
    except SupabaseNotConfigured as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "supabase_not_configured",
                "message": "The Supabase integration is not configured.",
                "details": None,
            },
        ) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "supabase_request_failed",
                "message": "The taxonomy service is temporarily unavailable.",
                "details": {"upstream_status": exc.status_code},
            },
        ) from exc
    return TaxonomyResponse.model_validate(taxonomy)
