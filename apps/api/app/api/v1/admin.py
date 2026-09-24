from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies import AdminPrincipal, require_admin
from app.models.admin import (
    AdminActionResponse,
    AdminUserResponse,
    AnswerUpsertRequest,
    MarkingItemCreateRequest,
    PaperCreateRequest,
    PaperPatchRequest,
    QuestionCreateRequest,
    VideoSourceCreateRequest,
)
from app.repositories.admin import AdminRepositoryError, SupabaseAdminRepository

router = APIRouter(prefix="/admin", tags=["admin"])


def _http_error(exc: AdminRepositoryError) -> HTTPException:
    return HTTPException(
        status_code=exc.status_code,
        detail={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    )


@router.get("/me", response_model=AdminUserResponse)
async def current_admin(
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminUserResponse:
    return AdminUserResponse(
        id=principal.id,
        display_name=principal.display_name,
        role=principal.role,
    )


@router.post(
    "/papers",
    response_model=AdminActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a draft O/L Mathematics paper",
)
async def create_paper(
    request: Request,
    payload: PaperCreateRequest,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminActionResponse:
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        paper = await repository.create_paper(payload, principal.id)
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminActionResponse(data=paper)


@router.get(
    "/papers/{paper_id}",
    response_model=AdminActionResponse,
    summary="Get a complete editable paper",
)
async def get_admin_paper(
    request: Request,
    paper_id: UUID,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminActionResponse:
    del principal
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        bundle = await repository.get_paper_bundle(paper_id)
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminActionResponse(data=bundle)


@router.patch(
    "/papers/{paper_id}",
    response_model=AdminActionResponse,
    summary="Update paper metadata",
)
async def update_paper(
    request: Request,
    paper_id: UUID,
    payload: PaperPatchRequest,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminActionResponse:
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        paper = await repository.update_paper(paper_id, payload, principal.id)
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminActionResponse(data=paper)


@router.post(
    "/papers/{paper_id}/questions",
    response_model=AdminActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an ordered question to a draft paper",
)
async def create_question(
    request: Request,
    paper_id: UUID,
    payload: QuestionCreateRequest,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminActionResponse:
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        question = await repository.create_question(paper_id, payload, principal.id)
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminActionResponse(data=question)


@router.put(
    "/questions/{question_id}/answer",
    response_model=AdminActionResponse,
    summary="Create or replace a Sinhala answer",
)
async def save_answer(
    request: Request,
    question_id: UUID,
    payload: AnswerUpsertRequest,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminActionResponse:
    del principal
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        answer = await repository.upsert_answer(question_id, payload)
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminActionResponse(data=answer)


@router.post(
    "/questions/{question_id}/marking-scheme",
    response_model=AdminActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a full marking-scheme item",
)
async def create_marking_item(
    request: Request,
    question_id: UUID,
    payload: MarkingItemCreateRequest,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminActionResponse:
    del principal
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        item = await repository.create_marking_item(question_id, payload)
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminActionResponse(data=item)


@router.post(
    "/papers/{paper_id}/video-sources",
    response_model=AdminActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Attach a paper- or question-level video source",
)
async def create_video_source(
    request: Request,
    paper_id: UUID,
    payload: VideoSourceCreateRequest,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminActionResponse:
    del principal
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        source = await repository.create_video_source(paper_id, payload)
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminActionResponse(data=source)


@router.post(
    "/papers/{paper_id}/publish",
    response_model=AdminActionResponse,
    summary="Validate and publish a paper",
    description=(
        "Publishes only when every question has an answer and marking scheme, "
        "mark totals are valid, and at least one video source exists."
    ),
)
async def publish_paper(
    request: Request,
    paper_id: UUID,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> AdminActionResponse:
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        paper = await repository.publish_paper(paper_id, principal.id)
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminActionResponse(data=paper)
