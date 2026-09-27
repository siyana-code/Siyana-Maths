import struct
import zlib
from typing import Any
from uuid import UUID, uuid4

import pytest

from app.core.config import Settings
from app.repositories.media import MediaError, SupabaseMediaRepository, _sniff_image_mime

QUESTION_ID = UUID("00000000-0000-0000-0000-000000000011")
ANSWER_ID = UUID("00000000-0000-0000-0000-000000000012")
ADMIN_ID = UUID("00000000-0000-0000-0000-000000000001")


def png_bytes(width: int = 4, height: int = 4) -> bytes:
    """Build a real, minimal PNG so magic-number sniffing is exercised."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b"".join(b"\x00" + b"\x7f\x7f\x7f" * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def jpeg_bytes() -> bytes:
    return b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 32 + b"\xff\xd9"


class FakeStorageGateway:
    def __init__(self, owner_exists: bool = True) -> None:
        self.owner_exists = owner_exists
        self.uploads: list[dict[str, Any]] = []
        self.deletes: list[tuple[str, str]] = []
        self.inserts: list[dict[str, Any]] = []
        self.media_row: dict[str, Any] | None = None

    @staticmethod
    def _table_path(table: str) -> str:
        return f"/rest/v1/{table}"

    def storage_public_url(self, bucket: str, object_path: str) -> str:
        return f"https://example.supabase.co/storage/v1/object/public/{bucket}/{object_path}"

    async def upload_object(self, *, bucket, object_path, body, content_type) -> dict[str, Any]:
        self.uploads.append(
            {
                "bucket": bucket,
                "object_path": object_path,
                "body": body,
                "content_type": content_type,
            }
        )
        return {"Key": object_path}

    async def delete_object(self, *, bucket, object_path) -> None:
        self.deletes.append((bucket, object_path))

    async def insert_row(self, table, payload, **kwargs) -> dict[str, Any]:
        assert table == "media_assets"
        self.inserts.append(payload)
        return {"id": str(uuid4()), "position": 1, **payload}

    async def request(self, method, path, **kwargs):
        import httpx

        if path.endswith("/media_assets"):
            rows = [self.media_row] if self.media_row else []
            return httpx.Response(200, json=rows)
        if path.endswith("/questions") or path.endswith("/answers"):
            rows = [{"id": str(QUESTION_ID)}] if self.owner_exists else []
            return httpx.Response(200, json=rows)
        return httpx.Response(200, json=[])


def media_settings(**overrides: Any) -> Settings:
    return Settings(
        app_env="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="anon",
        supabase_service_role_key="service",
        **overrides,
    )


# ------------------------------------------------------------- sniffing ---


def test_sniff_recognises_supported_formats() -> None:
    assert _sniff_image_mime(png_bytes()) == "image/png"
    assert _sniff_image_mime(jpeg_bytes()) == "image/jpeg"
    assert _sniff_image_mime(b"GIF89a" + b"\x00" * 8) == "image/gif"
    assert _sniff_image_mime(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == "image/webp"


def test_sniff_rejects_non_images() -> None:
    assert _sniff_image_mime(b"<svg onload=alert(1)></svg>") is None
    assert _sniff_image_mime(b"MZ\x90\x00") is None
    assert _sniff_image_mime(b"") is None


# --------------------------------------------------------------- upload ---


@pytest.mark.asyncio
async def test_upload_attaches_image_to_question() -> None:
    gateway = FakeStorageGateway()
    repo = SupabaseMediaRepository(gateway, media_settings())  # type: ignore[arg-type]

    row = await repo.upload(
        body=png_bytes(),
        filename="Graph of f.png",
        content_type="image/png",
        question_id=QUESTION_ID,
        answer_id=None,
        caption="Figure 1",
        alt_text=None,
        admin_id=ADMIN_ID,
    )

    assert len(gateway.uploads) == 1
    assert gateway.uploads[0]["content_type"] == "image/png"
    assert str(QUESTION_ID) in gateway.uploads[0]["object_path"]
    assert row["question_id"] == str(QUESTION_ID)
    assert "answer_id" not in row
    assert row["public_url"].startswith("https://example.supabase.co/storage/v1/object/public/")


@pytest.mark.asyncio
async def test_upload_rejects_when_neither_owner_is_given() -> None:
    repo = SupabaseMediaRepository(FakeStorageGateway(), media_settings())  # type: ignore[arg-type]

    with pytest.raises(MediaError) as excinfo:
        await repo.upload(
            body=png_bytes(),
            filename="a.png",
            content_type="image/png",
            question_id=None,
            answer_id=None,
            caption=None,
            alt_text=None,
            admin_id=ADMIN_ID,
        )

    assert excinfo.value.code == "media_owner_required"
    assert excinfo.value.status_code == 422


@pytest.mark.asyncio
async def test_upload_rejects_svg_and_scripts() -> None:
    repo = SupabaseMediaRepository(FakeStorageGateway(), media_settings())  # type: ignore[arg-type]

    with pytest.raises(MediaError) as excinfo:
        await repo.upload(
            body=b"<svg onload=alert(1)></svg>",
            filename="attack.svg",
            content_type="image/svg+xml",
            question_id=QUESTION_ID,
            answer_id=None,
            caption=None,
            alt_text=None,
            admin_id=ADMIN_ID,
        )

    assert excinfo.value.code == "media_type_not_allowed"
    assert excinfo.value.status_code == 415


@pytest.mark.asyncio
async def test_upload_rejects_renamed_file() -> None:
    repo = SupabaseMediaRepository(FakeStorageGateway(), media_settings())  # type: ignore[arg-type]

    with pytest.raises(MediaError) as excinfo:
        await repo.upload(
            body=png_bytes(),
            filename="not-really.png",
            content_type="image/jpeg",
            question_id=QUESTION_ID,
            answer_id=None,
            caption=None,
            alt_text=None,
            admin_id=ADMIN_ID,
        )

    assert excinfo.value.code == "media_type_mismatch"


@pytest.mark.asyncio
async def test_upload_rejects_oversized_image() -> None:
    repo = SupabaseMediaRepository(
        FakeStorageGateway(),  # type: ignore[arg-type]
        media_settings(media_max_bytes=64),
    )

    with pytest.raises(MediaError) as excinfo:
        await repo.upload(
            body=png_bytes(),
            filename="big.png",
            content_type="image/png",
            question_id=QUESTION_ID,
            answer_id=None,
            caption=None,
            alt_text=None,
            admin_id=ADMIN_ID,
        )

    assert excinfo.value.code == "media_too_large"
    assert excinfo.value.status_code == 413


@pytest.mark.asyncio
async def test_upload_rejects_empty_file() -> None:
    repo = SupabaseMediaRepository(FakeStorageGateway(), media_settings())  # type: ignore[arg-type]

    with pytest.raises(MediaError) as excinfo:
        await repo.upload(
            body=b"",
            filename="empty.png",
            content_type="image/png",
            question_id=QUESTION_ID,
            answer_id=None,
            caption=None,
            alt_text=None,
            admin_id=ADMIN_ID,
        )

    assert excinfo.value.code == "media_empty"


@pytest.mark.asyncio
async def test_upload_rejects_missing_owner() -> None:
    repo = SupabaseMediaRepository(
        FakeStorageGateway(owner_exists=False),  # type: ignore[arg-type]
        media_settings(),
    )

    with pytest.raises(MediaError) as excinfo:
        await repo.upload(
            body=png_bytes(),
            filename="a.png",
            content_type="image/png",
            question_id=uuid4(),
            answer_id=None,
            caption=None,
            alt_text=None,
            admin_id=ADMIN_ID,
        )

    assert excinfo.value.code == "media_owner_not_found"
    assert excinfo.value.status_code == 404


@pytest.mark.asyncio
async def test_object_paths_are_unique_per_upload() -> None:
    gateway = FakeStorageGateway()
    repo = SupabaseMediaRepository(gateway, media_settings())  # type: ignore[arg-type]

    for _ in range(2):
        await repo.upload(
            body=png_bytes(),
            filename="graph.png",
            content_type="image/png",
            question_id=QUESTION_ID,
            answer_id=None,
            caption=None,
            alt_text=None,
            admin_id=ADMIN_ID,
        )

    paths = [item["object_path"] for item in gateway.uploads]
    assert len(set(paths)) == 2
    assert all(path.endswith(".png") for path in paths)


@pytest.mark.asyncio
async def test_delete_removes_object_and_row() -> None:
    gateway = FakeStorageGateway()
    gateway.media_row = {"id": str(uuid4()), "storage_path": "q1/a.png"}
    repo = SupabaseMediaRepository(gateway, media_settings())  # type: ignore[arg-type]

    await repo.delete(UUID(gateway.media_row["id"]))

    assert gateway.deletes == [("content-media", "q1/a.png")]


@pytest.mark.asyncio
async def test_delete_reports_missing_asset() -> None:
    repo = SupabaseMediaRepository(FakeStorageGateway(), media_settings())  # type: ignore[arg-type]

    with pytest.raises(MediaError) as excinfo:
        await repo.delete(uuid4())

    assert excinfo.value.code == "media_not_found"
    assert excinfo.value.status_code == 404
