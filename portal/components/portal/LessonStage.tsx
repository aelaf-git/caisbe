"use client";

import Link from "next/link";
import BlockView, { TopicSections } from "@/components/portal/BlockView";
import ExamPlayer from "@/components/portal/ExamPlayer";
import type { ContentBlock, CourseDetail, Lesson, QuizAttempt } from "@/lib/lms";
import type { NavSelection } from "@/components/portal/coursePlayerTypes";
import { readingsForChapter } from "@/lib/readings";

export default function LessonStage({
  course,
  courseId,
  selection,
  activeTopic,
  activeTopicOutline,
  activeChapterBlock,
  chapterMedia,
  busy,
  onMarkComplete,
  onReload,
  onQuizResult,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  course: CourseDetail;
  courseId: number;
  selection: NavSelection | null;
  activeTopic: Lesson | null;
  activeTopicOutline: string;
  activeChapterBlock: ContentBlock | null;
  chapterMedia: ContentBlock[];
  busy: boolean;
  onMarkComplete: () => void;
  onReload: () => Promise<void>;
  onQuizResult?: (result: QuizAttempt | null) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="border border-ifma-border bg-admin-surface p-5 shadow-brand-card md:p-8">
        {selection?.kind === "chapter-readings" ? (
          <ChapterReadings
            title={course.chapters.find((chapter) => chapter.id === selection.chapterId)?.title ?? "Chapter"}
            readings={(() => {
              const chapter = course.chapters.find((item) => item.id === selection.chapterId);
              return chapter ? readingsForChapter(chapter) : [];
            })()}
          />
        ) : selection?.kind === "exam" && course.final_exam ? (
          course.exam_passed ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Final exam</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">
                  {course.final_exam.title}
                </h2>
              </div>
              <div className="rounded-md border border-admin-success/30 bg-admin-success-soft px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-admin-success">Passed</p>
                {course.exam_score != null ? (
                  <p className="mt-2 font-display text-4xl font-semibold tabular-nums text-caisbe-text-dark">
                    {course.exam_score}%
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-caisbe-text">Pass mark {course.final_exam.pass_percent}%</p>
              </div>
              {course.certificate_code ? (
                <Link
                  href={`/certificates/${course.certificate_code}`}
                  className="inline-flex rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark"
                >
                  View certificate
                </Link>
              ) : null}
            </div>
          ) : (
            <ExamPlayer
              key={course.final_exam.id}
              courseId={courseId}
              exam={course.final_exam}
              onFinished={onReload}
            />
          )
        ) : activeChapterBlock ? (
          <BlockView
            key={activeChapterBlock.id}
            block={activeChapterBlock}
            onQuizResult={onQuizResult}
            onAssignmentComplete={() => void onReload()}
          />
        ) : activeTopic ? (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Lecture</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">
                {activeTopicOutline ? `${activeTopicOutline} ` : ""}
                {activeTopic.title}
              </h2>
            </div>
            <TopicSections topic={activeTopic} topicOutline={activeTopicOutline} />
            {chapterMedia.length > 0 ? (
              <div className="space-y-4 border-t border-ifma-border-light pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-caisbe-muted">
                  Chapter files
                </h3>
                {chapterMedia.map((block) => (
                  <BlockView key={block.id} block={block} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-caisbe-muted">
            This course has no topics yet. Check back after content is published.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={onPrev}
          className="rounded-md border border-ifma-border bg-admin-surface px-4 py-2.5 text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-40"
        >
          Previous
        </button>
        {activeTopic ? (
          <button
            type="button"
            disabled={busy || activeTopic.completed}
            onClick={onMarkComplete}
            className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {activeTopic.completed ? "Topic completed" : busy ? "Saving…" : "Mark topic complete"}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={!hasNext}
          onClick={onNext}
          className="rounded-md border-2 border-caisbe-red bg-admin-surface px-4 py-2.5 text-sm font-semibold text-caisbe-red hover:bg-caisbe-red hover:text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function readingFileName(block: ContentBlock): string {
  const title = (block.title ?? "").trim();
  if (title) return title;
  const path = (block.url ?? "").split("?")[0];
  const file = decodeURIComponent(path.split("/").pop() || "").trim();
  return file || "Reading";
}

function readingKind(url: string | null): "pdf" | "doc" | "epub" | "link" | "file" {
  const raw = (url ?? "").trim();
  const path = raw.split("?")[0].toLowerCase();
  if (path.endsWith(".pdf")) return "pdf";
  if (path.endsWith(".doc") || path.endsWith(".docx")) return "doc";
  if (path.endsWith(".epub")) return "epub";
  if (/^https?:\/\//i.test(raw) && !path.includes("/api/uploads/")) return "link";
  return "file";
}

function ReadingIcon({ kind }: { kind: "pdf" | "doc" | "epub" | "link" | "file" }) {
  const label = kind === "file" ? "FILE" : kind === "link" ? "LINK" : kind.toUpperCase();
  return (
    <span className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md border border-ifma-border bg-admin-canvas text-caisbe-red">
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
      <span className="mt-0.5 text-[8px] font-semibold leading-none tracking-wide">{label}</span>
    </span>
  );
}

function ChapterReadings({ title, readings }: { title: string; readings: ContentBlock[] }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Chapter readings</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">{title}</h2>
      </div>
      {readings.length === 0 ? (
        <p className="text-sm text-caisbe-muted">No material is attached.</p>
      ) : (
        <ul className="space-y-2">
          {readings.map((block) => {
            const name = readingFileName(block);
            const kind = readingKind(block.url);
            if (!block.url) return null;
            return (
              <li key={block.id}>
                <a
                  href={block.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md border border-ifma-border px-3 py-3 text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
                >
                  <ReadingIcon kind={kind} />
                  <span className="min-w-0 font-semibold leading-snug">{name}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
