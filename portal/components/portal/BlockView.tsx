"use client";

import { useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import AssignmentWorkTabs from "@/components/portal/AssignmentWorkTabs";
import QuizPlayer from "@/components/portal/QuizPlayer";
import { apiFetch, ApiError } from "@/lib/auth";
import type { ContentBlock, Lesson, QuizAttempt } from "@/lib/lms";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import { outlineNumber } from "@/lib/outlineNumber";
import { isAdminUpload, isLegacyChapterReading } from "@/lib/readings";
import { sanitizeCoursePresentation } from "@/lib/sanitizeHtml";

function ResourceChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-none border border-ifma-border bg-admin-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
    >
      {label}
    </a>
  );
}

function mediaSrc(url: string | null | undefined): string | null {
  return resolveUploadUrl(url);
}

function viewerSrc(url: string) {
  return `${url.split("#")[0]}#toolbar=0&navpanes=0`;
}

function ProtectedPdf({ src, title }: { src: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  function forwardScroll(event: WheelEvent<HTMLDivElement>) {
    const frame = frameRef.current?.contentWindow;
    if (!frame) return;
    try {
      frame.scrollBy({ top: event.deltaY, left: event.deltaX });
    } catch {
      // A cross-origin viewer ignores scripted scrolling.
    }
  }

  return (
    <div className="relative h-[480px] overflow-hidden rounded-md border border-ifma-border bg-admin-surface">
      <iframe
        ref={frameRef}
        title={title}
        src={viewerSrc(src)}
        className="pointer-events-none h-full w-full border-0"
      />
      <div
        className="absolute inset-0"
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        onWheel={forwardScroll}
      />
    </div>
  );
}

export default function BlockView({
  block,
  heading,
  onQuizResult,
  onAssignmentComplete,
  protectedContent = false,
}: {
  block: ContentBlock;
  heading?: string;
  onQuizResult?: (result: QuizAttempt | null) => void;
  onAssignmentComplete?: () => void;
  protectedContent?: boolean;
}) {
  if (block.block_type === "text" || block.block_type === "subtopic") {
    const title = heading ?? block.title;
    return (
      <div className="prose prose-sm max-w-none break-words text-caisbe-text prose-headings:font-display prose-headings:text-caisbe-text-dark prose-a:text-caisbe-red prose-img:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:w-full prose-table:overflow-x-auto">
        {title ? <h3 className="mb-2 text-lg font-semibold">{title}</h3> : null}
        {block.body ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeCoursePresentation(block.body) }} />
        ) : null}
      </div>
    );
  }

  if (block.block_type === "video" && block.url) {
    const src = mediaSrc(block.url) ?? block.url;
    const isFile =
      src.startsWith("/api/uploads/") ||
      /\/uploads\/(?:[\w.-]+\/)*[a-f0-9]{32}\./i.test(src) ||
      /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src);
    return (
      <div className="space-y-2">
        {block.title ? <h3 className="text-lg font-semibold text-caisbe-text">{block.title}</h3> : null}
        <div className="overflow-hidden rounded-md bg-black">
          {isFile ? (
            <video
              controls
              controlsList={protectedContent ? "nodownload" : undefined}
              disablePictureInPicture={protectedContent}
              onContextMenu={protectedContent ? (event) => event.preventDefault() : undefined}
              className="aspect-video w-full"
              src={src}
            >
              <track kind="captions" />
            </video>
          ) : (
            <iframe
              title={block.title || "Video lecture"}
              src={src}
              className="aspect-video h-full w-full border-0"
              allowFullScreen
            />
          )}
        </div>
      </div>
    );
  }

  if (block.block_type === "image" && block.url) {
    const src = mediaSrc(block.url) ?? block.url;
    return (
      <div className="space-y-2">
        {block.title ? <h3 className="text-lg font-semibold text-caisbe-text">{block.title}</h3> : null}
        <div className="overflow-hidden rounded-md border border-ifma-border bg-[#fafaf8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={block.title || "Course image"}
            className="max-h-[480px] w-full object-contain"
          />
        </div>
      </div>
    );
  }

  if (block.block_type === "pdf" && block.url) {
    const src = mediaSrc(block.url) ?? block.url;
    return (
      <div className="space-y-3">
        {block.title ? <h3 className="text-lg font-semibold text-caisbe-text">{block.title}</h3> : null}
        {protectedContent ? (
          <ProtectedPdf src={src} title={block.title || "PDF"} />
        ) : (
          <>
            <ResourceChip href={src} label="Open PDF" />
            <iframe
              title={block.title || "PDF"}
              src={src}
              className="h-[480px] w-full rounded-md border border-ifma-border bg-admin-surface"
            />
          </>
        )}
      </div>
    );
  }

  if ((block.block_type === "document" || block.block_type === "epub") && block.url) {
    const src = mediaSrc(block.url) ?? block.url;
    return (
      <div className="space-y-2">
        {block.title ? <h3 className="text-lg font-semibold text-caisbe-text">{block.title}</h3> : null}
        {protectedContent ? (
          <p className="text-sm text-caisbe-muted">This file stays in the course and cannot be downloaded.</p>
        ) : (
          <ResourceChip
            href={src}
            label={block.block_type === "epub" ? "Download EPUB" : "Download document"}
          />
        )}
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
        quizId={block.quiz.id}
        title={block.quiz.title}
        questions={block.quiz.questions}
        hydrateCompleted={Boolean(block.completed)}
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

function assignmentScore(block: ContentBlock): string | null {
  if (block.review_status !== "passed" && block.review_status !== "failed") return null;
  if (block.points_possible != null && block.submission_score != null) {
    return `${block.submission_score} / ${block.points_possible}`;
  }
  return block.review_status === "passed" ? "Pass" : "Fail";
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

function AssignmentView({ block, onComplete }: { block: ContentBlock; onComplete?: () => void }) {
  const status = block.review_status ?? (block.completed ? "under_review" : null);
  const chapterUnlocked = Boolean(block.can_submit || block.can_resubmit || status);
  const bucket =
    status === "under_review"
      ? "submitted"
      : status === "passed" || status === "failed"
        ? "evaluated"
        : "pending";

  return (
    <AssignmentWorkTabs
      detail={{
        kind: "chapter",
        block_id: block.id,
        direct_assignment_id: null,
        title: block.title || "Assignment",
        instructions_body: block.body,
        instructions_url: block.url,
        instructions_label: block.label || block.title || "Assignment",
        can_submit: Boolean(block.can_submit),
        can_resubmit: Boolean(block.can_resubmit),
        can_withdraw: status === "under_review",
        unlocked: chapterUnlocked,
        bucket,
        due_at: block.due_at ?? null,
        review_status: status,
        body: block.submission_body ?? null,
        file_url: block.submission_file_url ?? null,
        file_name: block.submission_file_name ?? null,
      }}
      defaultTab="download"
      onChanged={async () => {
        onComplete?.();
      }}
      header={
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">
              {block.title || "Assignment"}
            </h2>
            {block.points_possible != null || block.due_at ? (
              <p className="mt-2 text-sm text-caisbe-muted">
                {block.points_possible != null ? <span>{block.points_possible} points</span> : null}
                {block.points_possible != null && block.due_at ? <span> · </span> : null}
                {block.due_at ? <span>Due {new Date(block.due_at).toLocaleString()}</span> : null}
              </p>
            ) : null}
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
      }
      statusPanel={
        status ? (
          <div className={`rounded-md border px-4 py-4 ${reviewTone(status)}`}>
            <p className="text-sm font-semibold">
              {status === "under_review"
                ? "Your work is waiting for review. You can keep going in the course."
                : status === "passed"
                  ? "This assignment was marked as passed."
                  : "This assignment was marked as failed. You can still continue the course."}
            </p>
            {assignmentScore(block) ? (
              <p className="mt-2 text-sm font-semibold">Score: {assignmentScore(block)}</p>
            ) : null}
            {block.is_late ? <p className="mt-2 text-sm">Submitted after the due date.</p> : null}
            {block.submission_feedback ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{block.submission_feedback}</p>
            ) : null}
            {block.submission_file_url ? (
              <a
                href={mediaSrc(block.submission_file_url) ?? block.submission_file_url}
                className="mt-3 inline-flex text-sm font-semibold underline"
                target="_blank"
                rel="noreferrer"
              >
                {block.submission_file_name || "Your submitted file"}
              </a>
            ) : block.submission_body ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{block.submission_body}</p>
            ) : null}
          </div>
        ) : null
      }
    />
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
  protectedContent = false,
}: {
  topic: Lesson;
  topicOutline: string;
  protectedContent?: boolean;
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
          className="prose prose-sm max-w-none break-words text-caisbe-text prose-headings:font-display prose-headings:text-caisbe-text-dark prose-img:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:w-full prose-table:overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitizeCoursePresentation(topic.body) }}
        />
      ) : null}
      <OutlineBranch
        parentId={null}
        parentOutline={topicOutline}
        sectionsByParent={tree.sectionsByParent}
        mediaByParent={tree.mediaByParent}
        protectedContent={protectedContent}
      />
    </div>
  );
}

function OutlineBranch({
  parentId,
  parentOutline,
  sectionsByParent,
  mediaByParent,
  protectedContent,
}: {
  parentId: number | null;
  parentOutline: string;
  sectionsByParent: Map<number | "root", ContentBlock[]>;
  mediaByParent: Map<number, ContentBlock[]>;
  protectedContent: boolean;
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
            <BlockView block={block} heading={heading} protectedContent={protectedContent} />
            {(mediaByParent.get(block.id) ?? []).map((media) => (
              <BlockView key={media.id} block={media} protectedContent={protectedContent} />
            ))}
            {isSubtopic ? (
              <OutlineBranch
                parentId={block.id}
                parentOutline={outline ?? parentOutline}
                sectionsByParent={sectionsByParent}
                mediaByParent={mediaByParent}
                protectedContent={protectedContent}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
