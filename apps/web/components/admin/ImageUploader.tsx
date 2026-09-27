"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CloseIcon, ImageIcon, UploadIcon } from "@/components/ui/Icons";
import { SpinnerIcon } from "@/components/ui/SpinnerIcon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { apiData, apiRaw, ApiError } from "@/lib/api";
import type { MediaAsset } from "@/lib/types";

type ImageUploaderProps = {
  /** Attach to a question or to that question's answer, never both. */
  questionId?: string;
  answerId?: string;
  label: string;
  hint?: string;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function ImageUploader({ questionId, answerId, label, hint }: ImageUploaderProps) {
  const { show } = useSnackbar();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      const rejected = list.filter((file) => !ACCEPTED.includes(file.type));
      const oversized = list.filter((file) => file.size > MAX_BYTES);
      const accepted = list.filter(
        (file) => ACCEPTED.includes(file.type) && file.size <= MAX_BYTES,
      );

      if (rejected.length > 0) {
        show(`${rejected[0].name}: only PNG, JPEG, WebP, or GIF images are allowed.`, "error");
      }
      if (oversized.length > 0) {
        show(`${oversized[0].name}: images must be 5 MB or smaller.`, "error");
      }
      if (accepted.length === 0) return;

      setUploading(true);
      for (const file of accepted) {
        const body = new FormData();
        body.append("file", file);
        if (questionId) body.append("question_id", questionId);
        if (answerId) body.append("answer_id", answerId);
        if (caption.trim()) body.append("caption", caption.trim());

        try {
          const asset = await apiData<MediaAsset>("/admin/media", { method: "POST", body });
          setAssets((current) => [...current, asset]);
        } catch (error) {
          show(
            error instanceof ApiError ? error.message : `${file.name} could not be uploaded.`,
            "error",
          );
        }
      }
      setUploading(false);
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
    },
    [questionId, answerId, caption, show],
  );

  async function remove(asset: MediaAsset) {
    try {
      await apiRaw(`/admin/media/${asset.id}`, { method: "DELETE" });
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      show("Image removed.", "success");
    } catch (error) {
      show(error instanceof ApiError ? error.message : "The image could not be removed.", "error");
    }
  }

  if (!questionId && !answerId) {
    return (
      <p className="muted t-body-small" style={{ margin: 0 }}>
        Save the {questionId ? "question" : "answer"} first, then add images.
      </p>
    );
  }

  return (
    <div className="stack-md">
      <div className="row-between">
        <div className="stack-sm">
          <span className="field-label">{label}</span>
          {hint ? <span className="muted t-body-small">{hint}</span> : null}
        </div>
        {uploading ? (
          <span className="row muted" style={{ gap: 8 }}>
            <SpinnerIcon size={16} />
            Uploading
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) void upload(event.target.files);
        }}
      />

      <div
        className={`dropzone${dragging ? " dropzone--active" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files) void upload(event.dataTransfer.files);
        }}
      >
        <span className="empty-state__icon" style={{ width: 44, height: 44 }}>
          <UploadIcon size={20} />
        </span>
        <strong className="t-label-large">Drop a graph or sketch here</strong>
        <span className="muted t-body-small">
          or click to choose — PNG, JPEG, WebP, or GIF up to 5 MB
        </span>
      </div>

      <input
        className="field-plain"
        value={caption}
        placeholder="Caption for the next image (optional), e.g. Figure 1: the given graph"
        onChange={(event) => setCaption(event.target.value)}
        aria-label="Image caption"
      />

      {assets.length > 0 ? (
        <div className="media-grid">
          {assets.map((asset) => (
            <figure className="media-card" key={asset.id}>
              {/* Supabase Storage serves these from the configured project origin. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.public_url} alt={asset.alt_text ?? asset.caption ?? "Question figure"} />
              {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
              <Button
                variant="text"
                size="sm"
                className="btn--icon"
                aria-label="Remove image"
                onClick={() => void remove(asset)}
              >
                <CloseIcon size={16} />
              </Button>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MediaGallery({
  assets,
  emptyText = "No images.",
}: {
  assets: MediaAsset[];
  emptyText?: string;
}) {
  if (assets.length === 0) {
    return <p className="muted t-body-small" style={{ margin: 0 }}>{emptyText}</p>;
  }
  return (
    <div className="media-grid">
      {assets.map((asset) => (
        <figure className="media-card" key={asset.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.public_url} alt={asset.alt_text ?? asset.caption ?? "Question figure"} />
          {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

export { ImageIcon };
