"use client";

import { useMemo, useState } from "react";
import QuizPlayer from "@/components/portal/QuizPlayer";
import { apiFetch, ApiError } from "@/lib/auth";
import type { ContentBlock, Lesson, QuizAttempt } from "@/lib/lms";
import { outlineNumber } from "@/lib/outlineNumber";
import { isAdminUpload, isLegacyChapterReading } from "@/lib/readings";
import { sanitizeCoursePresentation } from "@/lib/sanitizeHtml";

function ResourceChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-full border border-ifma-border bg-admin-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
    >
      {label}
    </a>
  );
}

export default function BlockView({
  block,
  heading,
  onQuizResult,
  onAssignmentComplete,
}: {
  block: ContentBlock;
  heading?: string;
  onQuizResult?: (result: QuizAttempt | null) => void;
  onAssignmentComplete?: () => void;
}) {
  if (block.block_type === "text" || block.block_type === "subtopic") {
    const title = heading ?? block.title;
    return (
      <div className="prose prose-sm max-w-none text-caisbe-text prose-headings:font-display prose-headings:text-caisbe-text-dark prose-a:text-caisbe-red">
        {title ? <h3 className="mb-2 text-lg font-semibold">{title}</h3> : null}
        {block.body ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeCoursePresentation(block.body) }} />
        ) : null}
      </div>
    );
  }

  if (block.block_type === "video" && block.url) {
    const isFile = block.url.startsWith("/api/uploads/") || block.url.endsWith(".mp4");
    return (
      <div className="space-y-2">
        {block.title ? <h3 className="text-lg font-semibold text-caisbe-text">{block.title}</h3> : null}
        <div className="overflow-hidden rounded-md bg-black">
          {isFile ? (
            <video controls className="aspect-video w-full" src={block.url}>
              <track kind="captions" />
            </video>
          ) : (
            <iframe
              title={block.title || "Video lecture"}
              src={block.url}
              className="aspect-video h-full w-full border-0"
              allowFullScreen
            />
          )}
        </div>
      </div>
    );
  }

  if (block.block_type === "image" && block.url) {
    return (
      <div className="space-y-2">
        {block.title ? <h3 className="text-lg font-semibold text-caisbe-text">{block.title}</h3> : null}
        <div className="overflow-hidden rounded-md border border-ifma-border bg-[#fafaf8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.title || "Course image"}
            className="max-h-[480px] w-full object-contain"
          />
        </div>
      </div>
    );
  }

  if (block.block_type === "pdf" && block.url) {
    return (
      <div className="space-y-3">
        {block.title ? <h3 className="text-lg font-semibold text-caisbe-text">{block.title}</h3> : null}
        <ResourceChip href={block.url} label="Open PDF" />
        <iframe
          title={block.title || "PDF"}
          src={block.url}
          className="h-[480px] w-full rounded-md border border-ifma-border bg-admin-surface"
        />
      </div>
    );
  }

  if ((block.block_type === "document" || block.block_type === "epub") && block.url) {
    return (
      <div className="space-y-2">
        {block.title ? <h3 className="text-lg font-semibold text-caisbe-text">{block.title}</h3> : null}
        <ResourceChip
          href={block.url}
          label={block.block_type === "epub" ? "Download EPUB" : "Download document"}
        />
      </div>
    );
  }

  if (block.block_type === "reading" && block.url && isAdminUpload(block.url)) {
    return null;
  }

  if (block.block_type === "link") {
    return null;
  }

  if (block.block_type === "assignment") {
    return <AssignmentView block={block} onComplete={onAssignmentComplete} />;
  }

  if (block.block_type === "quiz" && block.quiz) {
    return (
      <QuizPlayer
        title={block.quiz.title}
        questions={block.quiz.questions}
        onResult={onQuizResult}
        passedNote="Next opens the assignment."
        onSubmit={async (answers) => {
          const result = await apiFetch<QuizAttempt>(`/me/quizzes/${block.quiz!.id}/submit`, {
            method: "POST",
            body: JSON.stringify({ answers }),
          });
          onQuizResult?.(result);
          return result;
        }}
      />
    );
  }

  return null;
}

function AssignmentView({ block, onComplete }: { block: ContentBlock; onComplete?: () => void }) {
  const [done, setDone] = useState(Boolean(block.completed));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileName = block.label || block.title || "Assignment";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/me/blocks/${block.id}/complete`, { method: "POST" });
      setDone(true);
      onComplete?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to submit assignment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-ifma-border bg-[#fafaf8] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment</p>
        <h3 className="mt-1 text-xl font-semibold text-caisbe-text-dark">{block.title || "Assignment"}</h3>
      </div>
      {block.url ? (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md border border-ifma-border bg-admin-surface px-3 py-3 font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">File</span>
          <span className="min-w-0">{fileName}</span>
        </a>
      ) : block.body ? (
        <div className="whitespace-pre-wrap text-sm text-caisbe-text">{block.body}</div>
      ) : (
        <p className="text-sm text-caisbe-muted">No material is attached.</p>
      )}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      <button
        type="button"
        disabled={busy || done}
        onClick={() => void submit()}
        className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
      >
        {done ? "Submitted" : busy ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}

const SECTION_TYPES = new Set(["text", "subtopic"]);
const MEDIA_TYPES = new Set(["video", "pdf", "document", "image", "epub"]);

function sortBlocks(a: ContentBlock, b: ContentBlock) {
  return a.sort_order - b.sort_order || a.id - b.id;
}

export function TopicSections({
  topic,
  topicOutline,
}: {
  topic: Lesson;
  topicOutline: string;
}) {
  const tree = useMemo(() => {
    const sectionsByParent = new Map<number | "root", ContentBlock[]>();
    const mediaByParent = new Map<number, ContentBlock[]>();
    for (const block of topic.blocks) {
      if (block.block_type === "image" && block.title?.trim().toLowerCase() === "course cover") {
        continue;
      }
      if (isLegacyChapterReading(block) || block.block_type === "reading" || block.block_type === "link") {
        continue;
      }
      if (block.url && !isAdminUpload(block.url) && block.block_type !== "text" && block.block_type !== "subtopic") {
        continue;
      }
      if (SECTION_TYPES.has(block.block_type)) {
        const key = block.parent_id ?? "root";
        const list = sectionsByParent.get(key) ?? [];
        list.push(block);
        sectionsByParent.set(key, list);
      } else if (block.parent_id && MEDIA_TYPES.has(block.block_type)) {
        const list = mediaByParent.get(block.parent_id) ?? [];
        list.push(block);
        mediaByParent.set(block.parent_id, list);
      }
    }
    for (const list of sectionsByParent.values()) list.sort(sortBlocks);
    for (const list of mediaByParent.values()) list.sort(sortBlocks);
    return { sectionsByParent, mediaByParent };
  }, [topic.blocks]);

  return (
    <div className="space-y-6">
      {topic.body ? (
        <div
          className="prose prose-sm max-w-none text-caisbe-text prose-headings:font-display prose-headings:text-caisbe-text-dark"
          dangerouslySetInnerHTML={{ __html: sanitizeCoursePresentation(topic.body) }}
        />
      ) : null}
      <OutlineBranch
        parentId={null}
        parentOutline={topicOutline}
        sectionsByParent={tree.sectionsByParent}
        mediaByParent={tree.mediaByParent}
      />
    </div>
  );
}

function OutlineBranch({
  parentId,
  parentOutline,
  sectionsByParent,
  mediaByParent,
}: {
  parentId: number | null;
  parentOutline: string;
  sectionsByParent: Map<number | "root", ContentBlock[]>;
  mediaByParent: Map<number, ContentBlock[]>;
}) {
  const sections = sectionsByParent.get(parentId ?? "root") ?? [];
  let subtopicIndex = 0;

  return (
    <div className="space-y-6">
      {sections.map((block) => {
        const isSubtopic = block.block_type === "subtopic";
        if (isSubtopic) subtopicIndex += 1;
        const outline = isSubtopic
          ? outlineNumber(...parentOutline.split(".").map(Number), subtopicIndex)
          : undefined;
        const heading =
          isSubtopic && outline
            ? `${outline}${block.title ? ` ${block.title}` : ""}`
            : undefined;
        return (
          <div
            key={block.id}
            className={
              parentId
                ? "space-y-4 border-l-2 border-ifma-border-light pl-4"
                : "space-y-4 border-b border-ifma-border-light pb-6 last:border-b-0"
            }
          >
            <BlockView block={block} heading={heading} />
            {(mediaByParent.get(block.id) ?? []).map((media) => (
              <BlockView key={media.id} block={media} />
            ))}
            {isSubtopic ? (
              <OutlineBranch
                parentId={block.id}
                parentOutline={outline ?? parentOutline}
                sectionsByParent={sectionsByParent}
                mediaByParent={mediaByParent}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
