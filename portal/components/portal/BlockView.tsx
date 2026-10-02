"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import QuizPlayer from "@/components/portal/QuizPlayer";
import { apiFetch, apiUpload, ApiError } from "@/lib/auth";
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
    return <AssignmentView key={block.id} block={block} onComplete={onAssignmentComplete} />;
  }

  if (block.block_type === "quiz" && block.quiz) {
    return (
      <QuizPlayer
        key={block.quiz.id}
        title={block.quiz.title}
        questions={block.quiz.questions}
        onResult={onQuizResult}
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

function reviewLabel(status: string | null | undefined): string {
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "under_review") return "Under review";
  return "";
}

function reviewTone(status: string | null | undefined): string {
  if (status === "passed") return "border-admin-success/40 bg-admin-success-soft text-admin-success";
  if (status === "failed") return "border-caisbe-red/40 bg-caisbe-red/10 text-caisbe-red";
  if (status === "under_review") return "border-admin-warning/40 bg-admin-warning-soft text-caisbe-text-dark";
  return "border-ifma-border bg-admin-surface text-caisbe-muted";
}

function FileGlyph() {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ifma-border bg-admin-canvas text-caisbe-red">
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    </span>
  );
}

function AssignmentView({ block, onComplete }: { block: ContentBlock; onComplete?: () => void }) {
  const [status, setStatus] = useState(block.review_status ?? (block.completed ? "under_review" : null));
  const [source, setSource] = useState<"file" | "written">("file");
  const [file, setFile] = useState<File | null>(null);
  const [written, setWritten] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileName = block.label || block.title || "Assignment";

  useEffect(() => {
    setStatus(block.review_status ?? (block.completed ? "under_review" : null));
  }, [block.id, block.review_status, block.completed]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let url: string | null = null;
      let name: string | null = null;
      let body: string | null = null;
      if (source === "file") {
        if (!file) {
          setError("Choose a PDF or Word file.");
          return;
        }
        const uploaded = await apiUpload("/me/uploads", file);
        url = uploaded.url;
        name = uploaded.filename;
      } else {
        body = written.trim();
        if (!body) {
          setError("Write your answer.");
          return;
        }
      }
      await apiFetch(`/me/blocks/${block.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ body, url, file_name: name }),
      });
      setStatus("under_review");
      onComplete?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to submit assignment.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubmit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/me/blocks/${block.id}/submit`, { method: "DELETE" });
      setStatus(null);
      setFile(null);
      setWritten("");
      onComplete?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to unsubmit assignment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">
            {block.title || "Assignment"}
          </h2>
        </div>
        {status ? (
          <span
            className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${reviewTone(status)}`}
          >
            {reviewLabel(status)}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md border border-ifma-border bg-admin-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            Not submitted
          </span>
        )}
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Instructions</h3>
        {block.url ? (
          <a
            href={block.url}
            download
            className="flex items-center gap-3 rounded-md border border-ifma-border bg-admin-surface px-4 py-3 text-caisbe-text transition-colors hover:border-caisbe-red hover:text-caisbe-red"
          >
            <FileGlyph />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                Download document
              </span>
              <span className="mt-0.5 block truncate font-semibold">{fileName}</span>
            </span>
          </a>
        ) : block.body ? (
          <div className="rounded-md border border-ifma-border bg-admin-surface px-4 py-4 text-sm leading-relaxed text-caisbe-text whitespace-pre-wrap">
            {block.body}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-ifma-border px-4 py-6 text-sm text-caisbe-muted">
            No material is attached.
          </p>
        )}
      </section>

      <section className="space-y-3 border-t border-ifma-border-light pt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Your response</h3>
        {status ? (
          <div className={`rounded-md border px-4 py-4 ${reviewTone(status)}`}>
            <p className="text-sm font-semibold">
              {status === "under_review"
                ? "Your work is waiting for review. You can keep going in the course."
                : status === "passed"
                  ? "This assignment was marked as passed."
                  : "This assignment was marked as failed. You can still continue the course."}
            </p>
            {status === "under_review" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void unsubmit()}
                className="mt-4 rounded-md border-2 border-ifma-border bg-admin-surface px-5 py-2.5 text-sm font-semibold uppercase text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-60"
              >
                {busy ? "Withdrawing…" : "Unsubmit"}
              </button>
            ) : null}
            {error ? <p className="mt-3 text-sm text-caisbe-red">{error}</p> : null}
          </div>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="space-y-4 rounded-md border border-ifma-border bg-[#fafaf8] p-4 md:p-5"
          >
            <p className="text-sm text-caisbe-muted">
              Complete the exercise, then submit either a document or a written answer.
            </p>
            <div className="flex w-full max-w-md rounded-md border border-ifma-border bg-admin-surface p-1">
              <button
                type="button"
                onClick={() => {
                  setSource("file");
                  setWritten("");
                }}
                className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                  source === "file" ? "bg-caisbe-red text-white" : "text-caisbe-text hover:bg-ifma-border-light"
                }`}
              >
                Upload document
              </button>
              <button
                type="button"
                onClick={() => {
                  setSource("written");
                  setFile(null);
                }}
                className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                  source === "written" ? "bg-caisbe-red text-white" : "text-caisbe-text hover:bg-ifma-border-light"
                }`}
              >
                Written answer
              </button>
            </div>
            {source === "file" ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-caisbe-text">PDF or Word file</span>
                <input
                  key="answer-file"
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full rounded-md border border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-muted file:mr-3 file:rounded-md file:border-0 file:bg-caisbe-red/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-caisbe-red"
                />
                {file ? <p className="text-xs text-caisbe-muted">Selected: {file.name}</p> : null}
              </label>
            ) : (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-caisbe-text">Written answer</span>
                <textarea
                  key="answer-text"
                  required
                  value={written}
                  onChange={(event) => setWritten(event.target.value)}
                  rows={6}
                  placeholder="Write your answer here"
                  className="w-full rounded-md border border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red"
                />
              </label>
            )}
            {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          </form>
        )}
      </section>
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
