"use client";

import { useMemo, useRef, useState } from "react";
import RichTextEditor from "@/components/lms/RichTextEditor";
import { CollapseToggle } from "@/components/ui/CollapseToggle";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, apiUpload, ApiError } from "@/lib/auth";
import type { ContentBlock, Lesson } from "@/lib/lms";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

const SECTION_TYPES = new Set(["text", "subtopic"]);
const MEDIA_TYPES = new Set(["video", "pdf", "document", "image", "epub", "link"]);

const UPLOAD_ACCEPT =
  "video/*,image/*,.pdf,.epub,.doc,.docx,application/pdf,application/epub+zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type MediaBlockType = "video" | "image" | "pdf" | "epub" | "document";

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

export default function TopicContentEditor({
  topic,
  onChanged,
  onError,
  askConfirm,
}: {
  topic: Lesson;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(topic.title);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const sections = useMemo(
    () =>
      topic.blocks
        .filter((b) => !b.parent_id && SECTION_TYPES.has(b.block_type))
        .slice()
        .sort(sortByOrder),
    [topic.blocks],
  );

  const mediaByParent = useMemo(() => {
    const map = new Map<number, ContentBlock[]>();
    for (const block of topic.blocks) {
      if (block.parent_id && MEDIA_TYPES.has(block.block_type)) {
        const list = map.get(block.parent_id) ?? [];
        list.push(block);
        map.set(block.parent_id, list);
      }
    }
    for (const list of map.values()) list.sort(sortByOrder);
    return map;
  }, [topic.blocks]);

  const summary = useMemo(() => {
    const mediaCount = [...mediaByParent.values()].reduce((n, list) => n + list.length, 0);
    const parts: string[] = [];
    if (sections.length) {
      parts.push(`${sections.length} block${sections.length === 1 ? "" : "s"}`);
    }
    if (mediaCount) {
      parts.push(`${mediaCount} upload${mediaCount === 1 ? "" : "s"}`);
    }
    return parts.length ? parts.join(" · ") : "Empty topic";
  }, [mediaByParent, sections.length]);

  const titleAutosave = useAutosave({
    id: `topic-${topic.id}-title`,
    value: title,
    baselineKey: topic.id,
    delayMs: 700,
    save: async (next) => {
      const trimmed = next.trim() || topic.title;
      try {
        await apiFetch(`/admin/lessons/${topic.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: trimmed }),
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.detail : "Unable to rename topic.";
        onError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
  });

  async function toggleExpanded() {
    if (expanded) {
      await titleAutosave.flush();
      setExpanded(false);
      return;
    }
    setExpanded(true);
  }

  async function deleteTopic() {
    const ok = await askConfirm({
      title: "Delete topic?",
      description: `Delete topic “${topic.title}” and all of its blocks?`,
      confirmLabel: "Delete topic",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/lessons/${topic.id}`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete topic.");
    }
  }

  async function addSection(blockType: "text" | "subtopic") {
    try {
      await apiFetch(`/admin/lessons/${topic.id}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          block_type: blockType,
          title: blockType === "subtopic" ? "Untitled subtopic" : "Untitled text",
          body: "",
          sort_order: sections.length,
        }),
      });
      setExpanded(true);
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to add block.");
    }
  }

  async function persistOrder(next: ContentBlock[]) {
    try {
      await apiFetch(`/admin/lessons/${topic.id}/blocks/reorder`, {
        method: "PUT",
        body: JSON.stringify({
          items: next.map((block, index) => ({ id: block.id, sort_order: index })),
        }),
      });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to reorder blocks.");
    }
  }

  async function moveSection(id: number, direction: -1 | 1) {
    const index = sections.findIndex((b) => b.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    const next = sections.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    await persistOrder(next);
  }

  function onDropOn(targetId: number) {
    if (draggingId == null || draggingId === targetId) return;
    const from = sections.findIndex((b) => b.id === draggingId);
    const to = sections.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return;
    const next = sections.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setDraggingId(null);
    void persistOrder(next);
  }

  return (
    <div className="border border-ifma-border-light bg-[#fafaf8]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-3">
        <CollapseToggle
          expanded={expanded}
          onToggle={() => void toggleExpanded()}
          label={title || "topic"}
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void titleAutosave.flush()}
          className="h-10 min-w-[180px] flex-1 rounded-md border border-ifma-border bg-white px-3 text-sm font-semibold outline-none focus:border-caisbe-green"
        />
        <DeleteIconButton label="Delete topic" onClick={() => void deleteTopic()} />
      </div>
      {!expanded ? <p className="px-3 pb-3 text-xs text-caisbe-muted">{summary}</p> : null}

      {expanded ? (
        <div className="space-y-3 border-t border-ifma-border-light px-3 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void addSection("text")}
              className="flex items-center justify-center gap-2 rounded-md border-2 border-caisbe-green bg-white px-4 py-3 text-sm font-semibold text-caisbe-green hover:bg-caisbe-green/5"
            >
              <span className="text-base leading-none" aria-hidden>
                +
              </span>
              Add text block
            </button>
            <button
              type="button"
              onClick={() => void addSection("subtopic")}
              className="flex items-center justify-center gap-2 rounded-md border-2 border-caisbe-green bg-white px-4 py-3 text-sm font-semibold text-caisbe-green hover:bg-caisbe-green/5"
            >
              <span className="text-base leading-none" aria-hidden>
                +
              </span>
              Add subtopic block
            </button>
          </div>

          {sections.length === 0 ? (
            <p className="rounded-md border border-dashed border-ifma-border bg-white px-4 py-5 text-sm text-caisbe-muted">
              Add a text or subtopic block. Uploads attach under a block and stay at the bottom of that
              block.
            </p>
          ) : (
            <div className="space-y-3">
              {sections.map((block, index) => (
                <SectionBlockCard
                  key={block.id}
                  block={block}
                  media={mediaByParent.get(block.id) ?? []}
                  canMoveUp={index > 0}
                  canMoveDown={index < sections.length - 1}
                  dragging={draggingId === block.id}
                  onDragStart={() => setDraggingId(block.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDrop={() => onDropOn(block.id)}
                  onMoveUp={() => void moveSection(block.id, -1)}
                  onMoveDown={() => void moveSection(block.id, 1)}
                  onChanged={onChanged}
                  onError={onError}
                  askConfirm={askConfirm}
                  lessonId={topic.id}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SectionBlockCard({
  block,
  media,
  canMoveUp,
  canMoveDown,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onMoveUp,
  onMoveDown,
  onChanged,
  onError,
  askConfirm,
  lessonId,
}: {
  block: ContentBlock;
  media: ContentBlock[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  askConfirm: AskConfirm;
  lessonId: number;
}) {
  const isSubtopic = block.block_type === "subtopic";
  const [expanded, setExpanded] = useState(true);
  const [title, setTitle] = useState(block.title ?? "");
  const [body, setBody] = useState(block.body ?? "");

  const draft = { title, body };
  const autosave = useAutosave({
    id: `block-${block.id}`,
    value: draft,
    baselineKey: `${block.id}:${block.title ?? ""}:${(block.body ?? "").length}`,
    delayMs: 800,
    save: async (next) => {
      try {
        await apiFetch(`/admin/blocks/${block.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: next.title.trim() || (isSubtopic ? "Untitled subtopic" : "Untitled text"),
            body: next.body,
          }),
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.detail : "Unable to save block.";
        onError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
  });

  async function deleteBlock() {
    const ok = await askConfirm({
      title: isSubtopic ? "Delete subtopic block?" : "Delete text block?",
      description: `Delete this ${isSubtopic ? "subtopic" : "text"} block and its uploads?`,
      confirmLabel: "Delete block",
    });
    if (!ok) return;
    try {
      await autosave.flush();
      await apiFetch(`/admin/blocks/${block.id}`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete block.");
    }
  }

  async function uploadMedia(file: File, sortOrder: number) {
    const blockType = inferMediaBlockType(file);
    if (!blockType) {
      onError("File type not allowed. Use videos, images, PDF, EPUB, or Word.");
      return;
    }
    try {
      const uploaded = await apiUpload("/admin/uploads", file);
      await apiFetch(`/admin/lessons/${lessonId}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          block_type: blockType,
          parent_id: block.id,
          title: file.name,
          url: uploaded.url,
          sort_order: sortOrder,
        }),
      });
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to upload file.");
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    let order = media.length;
    for (const file of list) {
      if (!inferMediaBlockType(file)) {
        onError("File type not allowed. Use videos, images, PDF, EPUB, or Word.");
        continue;
      }
      await uploadMedia(file, order);
      order += 1;
    }
    await onChanged();
  }

  async function deleteMedia(mediaBlock: ContentBlock) {
    const ok = await askConfirm({
      title: "Remove upload?",
      description: `Remove “${mediaBlock.title || mediaBlock.block_type}” from this block?`,
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
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`rounded-md border border-ifma-border bg-white ${dragging ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className="inline-flex h-9 w-9 cursor-grab items-center justify-center text-caisbe-muted active:cursor-grabbing"
          title="Drag to reorder"
          aria-label="Drag to reorder"
          role="button"
          tabIndex={0}
        >
          <DragHandleIcon />
        </span>
        <CollapseToggle
          expanded={expanded}
          onToggle={() => {
            if (expanded) void autosave.flush();
            setExpanded((v) => !v);
          }}
          label={isSubtopic ? "subtopic block" : "text block"}
        />
        <span className="rounded-md bg-caisbe-green/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-caisbe-green">
          {isSubtopic ? "Subtopic" : "Text"}
        </span>
        {!expanded && title ? (
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-caisbe-text">{title}</span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <div className="flex items-center gap-0.5">
          <OrderButton label="Move up" disabled={!canMoveUp} onClick={onMoveUp}>
            ↑
          </OrderButton>
          <OrderButton label="Move down" disabled={!canMoveDown} onClick={onMoveDown}>
            ↓
          </OrderButton>
          <DeleteIconButton
            label={isSubtopic ? "Delete subtopic block" : "Delete text block"}
            onClick={() => void deleteBlock()}
          />
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-ifma-border-light px-3 py-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void autosave.flush()}
              placeholder={isSubtopic ? "Subtopic title" : "Text block title"}
              className="h-10 w-full rounded-md border border-ifma-border px-3 text-sm font-semibold outline-none focus:border-caisbe-green"
            />
          </label>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Content
            </p>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder={
                isSubtopic ? "Write the subtopic content…" : "Write the text block content…"
              }
            />
          </div>

          <div className="space-y-2 rounded-md border border-ifma-border bg-[#f7f7f4] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Uploads
            </p>
            {media.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {media.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 border border-ifma-border bg-white px-3 py-2"
                  >
                    <span>
                      <span className="font-semibold uppercase text-caisbe-red">{item.block_type}</span>
                      {item.title ? ` — ${item.title}` : null}
                    </span>
                    <DeleteIconButton
                      label={`Remove ${item.title || item.block_type}`}
                      onClick={() => void deleteMedia(item)}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
            <UploadDropzone onFiles={(files) => void uploadFiles(files)} />
          </div>
        </div>
      ) : (
        <p className="border-t border-ifma-border-light px-3 py-2 text-xs text-caisbe-muted">
          {media.length
            ? `${media.length} upload${media.length === 1 ? "" : "s"} attached`
            : "No uploads"}
        </p>
      )}
    </div>
  );
}

function OrderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-caisbe-muted hover:bg-ifma-border-light hover:text-caisbe-green disabled:opacity-30"
    >
      {children}
    </button>
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

function DragHandleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}
