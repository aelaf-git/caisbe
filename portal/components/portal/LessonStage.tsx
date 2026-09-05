"use client";

import Link from "next/link";
import BlockView, { TopicSections } from "@/components/portal/BlockView";
import QuizPlayer from "@/components/portal/QuizPlayer";
import { apiFetch } from "@/lib/auth";
import type { ContentBlock, CourseDetail, Lesson, QuizAttempt } from "@/lib/lms";
import type { NavSelection } from "@/components/portal/coursePlayerTypes";

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
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="border border-ifma-border bg-white p-5 shadow-brand-card md:p-8">
        {selection?.kind === "exam" && course.final_exam ? (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Final exam</p>
            <h2 className="font-display text-2xl font-semibold text-caisbe-text-dark">
              {course.final_exam.title}
            </h2>
            <p className="text-sm text-caisbe-muted">Pass mark: {course.final_exam.pass_percent}%</p>
            {course.exam_passed ? (
              <p className="text-sm text-caisbe-text">
                You already passed this exam.
                {course.certificate_code ? (
                  <>
                    {" "}
                    <Link
                      href={`/certificates/${course.certificate_code}`}
                      className="font-semibold text-caisbe-red underline"
                    >
                      View certificate
                    </Link>
                  </>
                ) : null}
              </p>
            ) : (
              <QuizPlayer
                title={course.final_exam.title}
                questions={course.final_exam.questions}
                onSubmit={async (answers) => {
                  const result = await apiFetch<QuizAttempt>(
                    `/me/courses/${courseId}/final-exam/submit`,
                    {
                      method: "POST",
                      body: JSON.stringify({ answers }),
                    },
                  );
                  await onReload();
                  return result;
                }}
              />
            )}
          </div>
        ) : activeChapterBlock ? (
          <BlockView block={activeChapterBlock} onQuizResult={() => void onReload()} />
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
          className="rounded-md border border-ifma-border bg-white px-4 py-2.5 text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-40"
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
          className="rounded-md border-2 border-caisbe-red bg-white px-4 py-2.5 text-sm font-semibold text-caisbe-red hover:bg-caisbe-red hover:text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
