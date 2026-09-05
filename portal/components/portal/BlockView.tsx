"use client";

import { useMemo } from "react";
import QuizPlayer from "@/components/portal/QuizPlayer";
import { apiFetch } from "@/lib/auth";
import type { ContentBlock, Lesson, QuizAttempt } from "@/lib/lms";
import { outlineNumber } from "@/lib/outlineNumber";
import { sanitizeContentBody } from "@/lib/sanitizeHtml";

function ResourceChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-full border border-ifma-border bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
    >
      {label}
    </a>
  );
}

export default function BlockView({
  block,
  heading,
  onQuizResult,
}: {
  block: ContentBlock;
  heading?: string;
  onQuizResult?: (result: QuizAttempt) => void;
}) {
  if (block.block_type === "text" || block.block_type === "subtopic") {
    const title = heading ?? block.title;
    return (
      <div className="prose prose-sm max-w-none text-caisbe-text prose-headings:font-display prose-headings:text-caisbe-text-dark prose-a:text-caisbe-red">
        {title ? <h3 className="mb-2 text-lg font-semibold">{title}</h3> : null}
        {block.body ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeContentBody(block.body) }} />
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
          className="h-[480px] w-full rounded-md border border-ifma-border bg-white"
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

  if (block.block_type === "link" && block.url) {
    return (
      <div className="space-y-2">
        {block.title ? <p className="text-sm font-medium text-caisbe-text">{block.title}</p> : null}
        <ResourceChip href={block.url} label={block.label || "Open link"} />
      </div>
    );
  }

  if (block.block_type === "assignment") {
    const fileLabel = block.label || block.title || "Assignment file";
    const fileUrl = block.url;
    const isPdf = fileUrl?.toLowerCase().split("?")[0].endsWith(".pdf");

    return (
      <div className="rounded-md border border-ifma-border bg-[#fafaf8] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment</p>
        <h3 className="mt-1 text-xl font-semibold text-caisbe-text-dark">{block.title || "Assignment"}</h3>
        {fileUrl ? (
          <div className="mt-4 space-y-3">
            <ResourceChip href={fileUrl} label={isPdf ? `Open PDF — ${fileLabel}` : `Download — ${fileLabel}`} />
            {isPdf ? (
              <iframe
                title={fileLabel}
                src={fileUrl}
                className="h-80 w-full rounded-md border border-ifma-border bg-white"
              />
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-caisbe-muted">No file attached to this assignment.</p>
        )}
        <p className="mt-4 text-xs text-caisbe-muted">
          Complete the assignment, then continue with the remaining topics.
        </p>
      </div>
    );
  }

  if (block.block_type === "quiz" && block.quiz) {
    return (
      <QuizPlayer
        title={block.quiz.title}
        questions={block.quiz.questions}
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

const SECTION_TYPES = new Set(["text", "subtopic"]);
const MEDIA_TYPES = new Set(["video", "pdf", "document", "image", "epub", "link"]);

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
          dangerouslySetInnerHTML={{ __html: sanitizeContentBody(topic.body) }}
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
