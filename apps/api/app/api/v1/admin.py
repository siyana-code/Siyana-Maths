from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)

from app.api.dependencies import AdminPrincipal, require_admin
from app.core.config import Settings
from app.models.admin import (
    AdminActionResponse,
    AdminUserResponse,
    AnswerUpsertRequest,
    MarkingItemCreateRequest,
    MediaAsset,
    PaperCreateRequest,
    PaperPatchRequest,
    QuestionCreateRequest,
    VideoSourceCreateRequest,
)
from app.models.taxonomy import AdminPaperListResponse
from app.repositories.admin import AdminRepositoryError, SupabaseAdminRepository
from app.repositories.media import MediaError, SupabaseMediaRepository

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


def _media_error(exc: MediaError) -> HTTPException:
    return HTTPException(
        status_code=exc.status_code,
        detail={"code": exc.code, "message": exc.message, "details": None},
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
    "/papers",
    response_model=AdminPaperListResponse,
    summary="List papers for the admin workspace",
)
async def list_admin_papers(
    request: Request,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
    status_filter: str | None = Query(
        default=None,
        alias="status",
        pattern="^(draft|published|archived)$",
    ),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
) -> AdminPaperListResponse:
    del principal
    repository = SupabaseAdminRepository(request.app.state.supabase)
    try:
        papers = await repository.list_papers(
            status=status_filter,
            query=q,
            page=page,
            page_size=page_size,
        )
    except AdminRepositoryError as exc:
        raise _http_error(exc) from exc
    return AdminPaperListResponse(
        data=papers,
        meta={"page": page, "page_size": page_size, "total": len(papers)},
    )


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


# ------------------------------------------------------------------- media


@router.post(
    "/media",
    response_model=MediaAsset,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a question or answer image",
    description=(
        "Stores a PNG, JPEG, WebP, or GIF image in Supabase Storage and records "
        "it against exactly one question or answer. The image bytes are "
        "inspected, so a renamed or non-image file is rejected."
    ),
)
async def upload_media(
    request: Request,
    file: Annotated[UploadFile, File(description="PNG, JPEG, WebP, or GIF image")],
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
    question_id: Annotated[UUID | None, Form()] = None,
    answer_id: Annotated[UUID | None, Form()] = None,
    caption: Annotated[str | None, Form(max_length=300)] = None,
    alt_text: Annotated[str | None, Form(max_length=300)] = None,
) -> MediaAsset:
    settings: Settings = request.app.state.settings
    body = await file.read()
    repository = SupabaseMediaRepository(request.app.state.supabase, settings)
    try:
        row = await repository.upload(
            body=body,
            filename=file.filename,
            content_type=file.content_type,
            question_id=question_id,
            answer_id=answer_id,
            caption=caption,
            alt_text=alt_text,
            admin_id=principal.id,
        )
    except MediaError as exc:
        raise _media_error(exc) from exc
    return MediaAsset.model_validate(row)


@router.delete(
    "/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a question or answer image",
)
async def delete_media(
    request: Request,
    media_id: UUID,
    principal: Annotated[AdminPrincipal, Depends(require_admin)],
) -> None:
    del principal
    settings: Settings = request.app.state.settings
    repository = SupabaseMediaRepository(request.app.state.supabase, settings)
    try:
        await repository.delete(media_id)
    except MediaError as exc:
        raise _media_error(exc) from exc
    return None
