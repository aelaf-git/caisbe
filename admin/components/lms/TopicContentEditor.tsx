"use client";

import { useMemo, useState } from "react";
import RichTextEditor from "@/components/lms/RichTextEditor";
import { CollapseToggle } from "@/components/ui/CollapseToggle";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, ApiError } from "@/lib/auth";
import type { ContentBlock, Lesson } from "@/lib/lms";
import { outlineNumber } from "@/lib/ordinalTitles";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

const SECTION_TYPES = new Set(["text", "subtopic"]);
const ROOT_KEY = "root";

function sortByOrder(a: ContentBlock, b: ContentBlock) {
  return a.sort_order - b.sort_order || a.id - b.id;
}

function parentKey(parentId: number | null | undefined): number | typeof ROOT_KEY {
  return parentId ?? ROOT_KEY;
}

function subtopicOrdinal(siblings: ContentBlock[], id: number): number | null {
  let n = 0;
  for (const sibling of siblings) {
    if (sibling.block_type !== "subtopic") continue;
    n += 1;
    if (sibling.id === id) return n;
  }
  return null;
}

export default function TopicContentEditor({
  topic,
  chapterSequence,
  topicIndex,
  onChanged,
  onError,
  askConfirm,
}: {
  topic: Lesson;
  chapterSequence: number;
  topicIndex: number;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const [expanded, setExpanded] = useState(true);
  const [title, setTitle] = useState(topic.title);
  const topicOutline = outlineNumber(chapterSequence, topicIndex + 1);

  const sectionsByParent = useMemo(() => {
    const map = new Map<number | typeof ROOT_KEY, ContentBlock[]>();
    for (const block of topic.blocks) {
      if (!SECTION_TYPES.has(block.block_type)) continue;
      const key = parentKey(block.parent_id);
      const list = map.get(key) ?? [];
      list.push(block);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort(sortByOrder);
    return map;
  }, [topic.blocks]);

  const rootSections = sectionsByParent.get(ROOT_KEY) ?? [];

  const summary = useMemo(() => {
    const sectionCount = [...sectionsByParent.values()].reduce((n, list) => n + list.length, 0);
    return sectionCount
      ? `${sectionCount} block${sectionCount === 1 ? "" : "s"}`
      : "Empty topic";
  }, [sectionsByParent]);

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

  return (
    <div className="border border-ifma-border-light bg-[#fafaf8]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-3">
        <CollapseToggle
          expanded={expanded}
          onToggle={() => void toggleExpanded()}
          label={title || "topic"}
        />
        <span className="shrink-0 text-sm font-semibold text-caisbe-muted">{topicOutline}</span>
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
          <NestedSectionList
            lessonId={topic.id}
            parentId={null}
            parentOutline={topicOutline}
            sections={rootSections}
            sectionsByParent={sectionsByParent}
            onChanged={onChanged}
            onError={onError}
            askConfirm={askConfirm}
          />
        </div>
      ) : null}
    </div>
  );
}

function NestedSectionList({
  lessonId,
  parentId,
  parentOutline,
  sections,
  sectionsByParent,
  onChanged,
  onError,
  askConfirm,
}: {
  lessonId: number;
  parentId: number | null;
  parentOutline: string;
  sections: ContentBlock[];
  sectionsByParent: Map<number | typeof ROOT_KEY, ContentBlock[]>;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const [draggingId, setDraggingId] = useState<number | null>(null);

  async function addSection(blockType: "text" | "subtopic") {
    try {
      await apiFetch(`/admin/lessons/${lessonId}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          block_type: blockType,
          parent_id: parentId,
          title: blockType === "subtopic" ? "Untitled subtopic" : null,
          body: "",
          sort_order: sections.length,
        }),
      });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to add block.");
    }
  }

  async function persistOrder(next: ContentBlock[]) {
    try {
      await apiFetch(`/admin/lessons/${lessonId}/blocks/reorder`, {
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
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void addSection("text")}
          className="flex items-center justify-center gap-2 rounded-md border-2 border-caisbe-green bg-white px-4 py-3 text-sm font-semibold text-caisbe-green hover:bg-caisbe-green/5"
        >
          <span className="text-base leading-none" aria-hidden>
            +
          </span>
          Add note
        </button>
        <button
          type="button"
          onClick={() => void addSection("subtopic")}
          className="flex items-center justify-center gap-2 rounded-md border-2 border-caisbe-green bg-white px-4 py-3 text-sm font-semibold text-caisbe-green hover:bg-caisbe-green/5"
        >
          <span className="text-base leading-none" aria-hidden>
            +
          </span>
          Add subtopic
        </button>
      </div>

      {sections.length === 0 && parentId == null ? (
        <p className="rounded-md border border-dashed border-ifma-border bg-white px-4 py-5 text-sm text-caisbe-muted">
          Add a note or subtopic. Subtopics can nest as deep as you need. Chapter files are managed
          in Chapter uploads below.
        </p>
      ) : null}

      {sections.length > 0 ? (
        <div className="space-y-3">
          {sections.map((block, index) => {
            const ordinal = subtopicOrdinal(sections, block.id);
            const outline =
              block.block_type === "subtopic" && ordinal != null
                ? outlineNumber(...parentOutline.split(".").map(Number), ordinal)
                : undefined;
            return (
              <SectionBlockCard
                key={block.id}
                block={block}
                outline={outline}
                nestedSections={sectionsByParent.get(block.id) ?? []}
                sectionsByParent={sectionsByParent}
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
                lessonId={lessonId}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SectionBlockCard({
  block,
  outline,
  nestedSections,
  sectionsByParent,
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
  outline?: string;
  nestedSections: ContentBlock[];
  sectionsByParent: Map<number | typeof ROOT_KEY, ContentBlock[]>;
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
            title: isSubtopic ? next.title.trim() || "Untitled subtopic" : null,
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
      title: isSubtopic ? "Delete subtopic?" : "Delete note?",
      description: isSubtopic
        ? "Delete this subtopic and everything nested under it?"
        : "Delete this note?",
      confirmLabel: "Delete",
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

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
      className={`rounded-md border border-ifma-border bg-white ${dragging ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
        <span
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
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
          label={isSubtopic ? "subtopic" : "note"}
        />
        <span className="rounded-md bg-caisbe-green/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-caisbe-green">
          {isSubtopic ? "Subtopic" : "Note"}
        </span>
        {outline ? (
          <span className="shrink-0 text-sm font-semibold text-caisbe-muted">{outline}</span>
        ) : null}
        {!expanded && isSubtopic && title ? (
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
            label={isSubtopic ? "Delete subtopic" : "Delete note"}
            onClick={() => void deleteBlock()}
          />
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-ifma-border-light px-3 py-3">
          {isSubtopic ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void autosave.flush()}
                placeholder="Subtopic title"
                className="h-10 w-full rounded-md border border-ifma-border px-3 text-sm font-semibold outline-none focus:border-caisbe-green"
              />
            </label>
          ) : null}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Content
            </p>
            <RichTextEditor
              key={block.id}
              value={body}
              onChange={setBody}
              placeholder={isSubtopic ? "Write the subtopic content…" : "Write the note…"}
            />
          </div>

          {isSubtopic ? (
            <div className="border-l-2 border-ifma-border pl-3">
              <NestedSectionList
                lessonId={lessonId}
                parentId={block.id}
                parentOutline={outline ?? ""}
                sections={nestedSections}
                sectionsByParent={sectionsByParent}
                onChanged={onChanged}
                onError={onError}
                askConfirm={askConfirm}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="border-t border-ifma-border-light px-3 py-2 text-xs text-caisbe-muted">
          {isSubtopic
            ? `${nestedSections.length} nested block${nestedSections.length === 1 ? "" : "s"}`
            : "Collapsed"}
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
