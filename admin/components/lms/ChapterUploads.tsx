"use client";

import { useMemo, useRef, useState } from "react";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import { apiFetch, apiUpload, ApiError } from "@/lib/auth";
import type { Chapter, ContentBlock } from "@/lib/lms";

const MEDIA_TYPES = new Set(["video", "pdf", "document", "image", "epub", "link"]);

const UPLOAD_ACCEPT =
  "video/*,image/*,.pdf,.epub,.doc,.docx,application/pdf,application/epub+zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type MediaBlockType = "video" | "image" | "pdf" | "epub" | "document";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function inferMediaBlockType(file: File): MediaBlockType | null {
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/.test(name)) return "video";
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/.test(name)) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime === "application/epub+zip" || name.endsWith(".epub")) return "epub";
  if (
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(docx?)$/.test(name)
  ) {
    return "document";
  }
  return null;
}

function sortByOrder(a: ContentBlock, b: ContentBlock) {
  return a.sort_order - b.sort_order || a.id - b.id;
}

export function isChapterMediaBlock(block: ContentBlock): boolean {
  return MEDIA_TYPES.has(block.block_type);
}

export default function ChapterUploads({
  chapter,
  onChanged,
  onError,
  askConfirm,
}: {
  chapter: Chapter;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const media = useMemo(
    () =>
      (chapter.blocks ?? [])
        .filter(isChapterMediaBlock)
        .slice()
        .sort(sortByOrder),
    [chapter.blocks],
  );

  async function uploadMedia(file: File, sortOrder: number) {
    const blockType = inferMediaBlockType(file);
    if (!blockType) {
      throw new Error("File type not allowed. Use videos, images, PDF, EPUB, or Word.");
    }
    const uploaded = await apiUpload("/admin/uploads", file);
    await apiFetch(`/admin/chapters/${chapter.id}/blocks`, {
      method: "POST",
      body: JSON.stringify({
        block_type: blockType,
        title: file.name,
        url: uploaded.url,
        sort_order: sortOrder,
      }),
    });
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    let order = media.length;
    let uploadedAny = false;
    for (const file of list) {
      try {
        await uploadMedia(file, order);
        uploadedAny = true;
        order += 1;
      } catch (err) {
        onError(err instanceof ApiError ? err.detail : "Unable to upload file.");
      }
    }
    if (uploadedAny) await onChanged();
  }

  async function deleteMedia(mediaBlock: ContentBlock) {
    const ok = await askConfirm({
      title: "Remove upload?",
      description: `Remove “${mediaBlock.title || mediaBlock.block_type}” from this chapter?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/blocks/${mediaBlock.id}`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to remove upload.");
    }
  }

  return (
    <div
      className="space-y-2 rounded-md border border-ifma-border bg-[#f7f7f4] p-4"
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length) void uploadFiles(files);
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
          Chapter uploads
        </p>
        <p className="mt-1 text-xs text-caisbe-muted">
          One shared upload area for this chapter. Files appear here after upload and for students
          with the chapter content. Maximum size: 500 MB per file.
        </p>
      </div>
      {media.length > 0 ? (
        <ul className="space-y-3">
          {media.map((item) => (
            <li key={item.id} className="border border-ifma-border bg-white p-3">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 text-sm">
                  <span className="font-semibold uppercase text-caisbe-red">{item.block_type}</span>
                  {item.title ? ` — ${item.title}` : null}
                </p>
                <DeleteIconButton
                  label={`Remove ${item.title || item.block_type}`}
                  onClick={() => void deleteMedia(item)}
                />
              </div>
              <UploadedFilePreview block={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-caisbe-muted">No files attached yet.</p>
      )}
      <UploadDropzone onFiles={(files) => void uploadFiles(files)} />
    </div>
  );
}

export function UploadedFilePreview({ block }: { block: ContentBlock }) {
  if (!block.url) {
    return <p className="text-xs text-caisbe-muted">File is missing a URL.</p>;
  }

  if (block.block_type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={block.url}
        alt={block.title || "Uploaded image"}
        className="max-h-56 w-full max-w-lg object-contain"
      />
    );
  }

  if (block.block_type === "video") {
    return (
      <video controls className="max-h-56 w-full max-w-lg bg-black" src={block.url}>
        <track kind="captions" />
      </video>
    );
  }

  if (block.block_type === "pdf") {
    return (
      <div>
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-caisbe-green hover:underline"
        >
          Open PDF
        </a>
        <iframe
          title={block.title || "PDF"}
          src={block.url}
          className="mt-2 h-56 w-full border border-ifma-border"
        />
      </div>
    );
  }

  return (
    <a
      href={block.url}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-semibold text-caisbe-green hover:underline"
    >
      {block.block_type === "epub" ? "Download EPUB" : "Open file"}
    </a>
  );
}

function UploadDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    onFiles(Array.from(fileList));
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors ${
        dragging
          ? "border-caisbe-green bg-caisbe-green/5"
          : "border-ifma-border bg-white"
      }`}
    >
      <p className="text-sm font-medium text-caisbe-text">Drag and drop files here, or</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 border-2 border-caisbe-green px-4 py-2 text-sm font-semibold text-caisbe-green hover:bg-caisbe-green hover:text-white"
      >
        Browse
      </button>
      <p className="mt-3 text-xs text-caisbe-muted">Allowed: videos, images, PDF, EPUB, Word</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
