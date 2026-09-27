import re
import unicodedata
from typing import Any
from uuid import UUID, uuid4

from app.core.config import Settings
from app.integrations.supabase import (
    SupabaseGateway,
    SupabaseNotConfigured,
    SupabaseRequestError,
)

MEDIA_BUCKET = "content-media"

# Magic-number signatures so the declared content type is not taken on trust.
_IMAGE_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
)

_EXTENSION_BY_MIME = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}


def _sniff_image_mime(body: bytes) -> str | None:
    """Return the detected image type, or None when the bytes are not an image."""
    for signature, mime in _IMAGE_SIGNATURES:
        if body.startswith(signature):
            return mime
    if len(body) >= 12 and body[0:4] == b"RIFF" and body[8:12] == b"WEBP":
        return "image/webp"
    return None


def _safe_extension(filename: str | None, mime: str) -> str:
    return _EXTENSION_BY_MIME.get(mime, "bin")


def _slugify_filename(filename: str | None) -> str:
    if not filename:
        return "image"
    normalized = unicodedata.normalize("NFKD", filename)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    stem = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).strip("-").lower()
    return (stem or "image")[:60]


class MediaError(RuntimeError):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class SupabaseMediaRepository:
    """Uploads question and answer images to Supabase Storage.

    The bucket is public-read, so stored URLs can be rendered directly. Only the
    backend holds the service-role key, so anonymous clients cannot upload.
    """

    def __init__(self, gateway: SupabaseGateway, settings: Settings) -> None:
        self.gateway = gateway
        self.settings = settings

    def _bucket(self) -> str:
        return self.settings.media_bucket or MEDIA_BUCKET

    async def list_for_paper(self, paper_id: UUID) -> list[dict[str, Any]]:
        question_ids = await self.gateway.request(
            "GET",
            self.gateway._table_path("questions"),
            params={"paper_id": f"eq.{paper_id}", "select": "id"},
            use_service_role=True,
        )
        rows = question_ids.json()
        if not isinstance(rows, list):
            raise SupabaseRequestError(question_ids.status_code, "Invalid questions response")
        ids = [str(row["id"]) for row in rows]
        if not ids:
            return []

        answer_rows = await self.gateway.request(
            "GET",
            self.gateway._table_path("answers"),
            params={"question_id": f"in.({','.join(ids)})", "select": "id"},
            use_service_role=True,
        )
        answers = answer_rows.json()
        if not isinstance(answers, list):
            raise SupabaseRequestError(answer_rows.status_code, "Invalid answers response")
        answer_ids = [str(row["id"]) for row in answers]
        if not answer_ids:
            return []

        response = await self.gateway.request(
            "GET",
            self.gateway._table_path("media_assets"),
            params={
                "answer_id": f"in.({','.join(answer_ids)})",
                "select": "*",
                "order": "position.asc",
            },
            use_service_role=True,
        )
        assets = response.json()
        if not isinstance(assets, list):
            raise SupabaseRequestError(response.status_code, "Invalid media response")
        return assets

    async def upload(
        self,
        *,
        body: bytes,
        filename: str | None,
        content_type: str | None,
        question_id: UUID | None,
        answer_id: UUID | None,
        caption: str | None,
        alt_text: str | None,
        admin_id: UUID,
    ) -> dict[str, Any]:
        if (question_id is None) == (answer_id is None):
            raise MediaError(
                "media_owner_required",
                "Attach the image to exactly one question or one answer.",
                422,
            )

        if not body:
            raise MediaError("media_empty", "The uploaded file is empty.", 422)
        if len(body) > self.settings.media_max_bytes:
            limit_mb = self.settings.media_max_bytes // (1024 * 1024)
            raise MediaError(
                "media_too_large",
                f"Images must be {limit_mb} MB or smaller.",
                413,
            )

        detected = _sniff_image_mime(body)
        if detected is None or detected not in self.settings.media_mime_types:
            allowed = ", ".join(self.settings.media_mime_types)
            raise MediaError(
                "media_type_not_allowed",
                f"Only these image types are accepted: {allowed}.",
                415,
            )
        if content_type and content_type != detected:
            # Trust the bytes, but reject a mismatch so a renamed file is obvious.
            raise MediaError(
                "media_type_mismatch",
                "The file contents do not match the declared image type.",
                415,
            )

        await self._verify_owner(question_id=question_id, answer_id=answer_id)

        extension = _safe_extension(filename, detected)
        object_path = (
            f"{question_id or answer_id}/"
            f"{_slugify_filename(filename)}-{uuid4().hex[:10]}.{extension}"
        )

        try:
            await self.gateway.upload_object(
                bucket=self._bucket(),
                object_path=object_path,
                body=body,
                content_type=detected,
            )
        except SupabaseNotConfigured as exc:
            raise MediaError(
                "media_storage_not_configured",
                "Supabase Storage is not configured.",
                503,
            ) from exc
        except SupabaseRequestError as exc:
            raise MediaError(
                "media_upload_failed",
                "The image could not be stored.",
                502,
                # surfaced through the API error detail
            ) from exc

        public_url = self.gateway.storage_public_url(self._bucket(), object_path)
        payload: dict[str, Any] = {
            "storage_path": object_path,
            "public_url": public_url,
            "mime_type": detected,
            "byte_size": len(body),
            "caption": (caption or "").strip() or None,
            "alt_text": (alt_text or "").strip() or None,
            "created_by": str(admin_id),
        }
        if question_id is not None:
            payload["question_id"] = str(question_id)
        else:
            payload["answer_id"] = str(answer_id)

        try:
            return await self.gateway.insert_row("media_assets", payload, use_service_role=True)
        except SupabaseRequestError as exc:
            # Do not leave an orphaned object behind if the row insert fails.
            try:
                await self.gateway.delete_object(bucket=self._bucket(), object_path=object_path)
            except SupabaseRequestError:
                pass
            raise MediaError(
                "media_record_failed",
                "The image was uploaded but could not be recorded.",
                502,
            ) from exc

    async def delete(self, media_id: UUID) -> None:
        try:
            response = await self.gateway.request(
                "GET",
                self.gateway._table_path("media_assets"),
                params={"id": f"eq.{media_id}", "select": "*", "limit": 1},
                use_service_role=True,
            )
            rows = response.json()
        except SupabaseRequestError as exc:
            raise MediaError(
                "media_lookup_failed",
                "The image could not be loaded.",
                502,
            ) from exc
        if not isinstance(rows, list) or not rows:
            raise MediaError("media_not_found", "Image not found.", 404)
        row = rows[0]

        try:
            await self.gateway.delete_object(
                bucket=self._bucket(), object_path=str(row["storage_path"])
            )
        except SupabaseRequestError:
            # The metadata row is removed regardless; a leftover object is harmless
            # and can be swept later.
            pass

        try:
            await self.gateway.request(
                "DELETE",
                self.gateway._table_path("media_assets"),
                params={"id": f"eq.{media_id}"},
                use_service_role=True,
            )
        except SupabaseRequestError as exc:
            raise MediaError(
                "media_delete_failed",
                "The image could not be removed.",
                502,
            ) from exc

    async def _verify_owner(self, *, question_id: UUID | None, answer_id: UUID | None) -> None:
        table = "questions" if question_id is not None else "answers"
        owner_id = question_id or answer_id
        try:
            response = await self.gateway.request(
                "GET",
                self.gateway._table_path(table),
                params={"id": f"eq.{owner_id}", "select": "id", "limit": 1},
                use_service_role=True,
            )
            rows = response.json()
        except SupabaseRequestError as exc:
            raise MediaError(
                "media_owner_lookup_failed",
                "The question or answer could not be loaded.",
                502,
            ) from exc
        if not isinstance(rows, list) or not rows:
            owner = "question" if question_id is not None else "answer"
            raise MediaError("media_owner_not_found", f"That {owner} does not exist.", 404)
