"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import QuizPlayer from "@/components/portal/QuizPlayer";
import { apiFetch, ApiError } from "@/lib/auth";
import type { ContentBlock, CourseDetail, Lesson, QuizAttempt } from "@/lib/lms";

function BlockView({
  block,
  onQuizResult,
}: {
  block: ContentBlock;
  onQuizResult?: (result: QuizAttempt) => void;
}) {
  if (block.block_type === "text") {
    return (
      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-caisbe-text">
        {block.title ? <h3 className="mb-2 text-lg font-semibold">{block.title}</h3> : null}
        <p>{block.body}</p>
      </div>
    );
  }

  if (block.block_type === "video" && block.url) {
    const isFile = block.url.startsWith("/api/uploads/") || block.url.endsWith(".mp4");
    return (
      <div>
        {block.title ? <h3 className="mb-2 text-lg font-semibold">{block.title}</h3> : null}
        {isFile ? (
          <video controls className="w-full max-w-3xl bg-black" src={block.url}>
            <track kind="captions" />
          </video>
        ) : (
          <div className="aspect-video w-full max-w-3xl">
            <iframe
              title={block.title || "Video lecture"}
              src={block.url}
              className="h-full w-full border-0"
              allowFullScreen
            />
          </div>
        )}
      </div>
    );
  }

  if (block.block_type === "pdf" && block.url) {
    return (
      <div>
        {block.title ? <h3 className="mb-2 text-lg font-semibold">{block.title}</h3> : null}
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-caisbe-green hover:text-caisbe-red"
        >
          Open PDF
        </a>
        <iframe title={block.title || "PDF"} src={block.url} className="mt-3 h-[480px] w-full border border-ifma-border" />
      </div>
    );
  }

  if (block.block_type === "link" && block.url) {
    return (
      <div>
        {block.title ? <h3 className="mb-2 text-lg font-semibold">{block.title}</h3> : null}
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-caisbe-green hover:text-caisbe-red"
        >
          {block.label || block.url}
        </a>
      </div>
    );
  }

  if (block.block_type === "assignment") {
    return (
      <div className="border border-ifma-border bg-[#fafafa] p-4">
        <h3 className="text-lg font-semibold">{block.title || "Assignment"}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-caisbe-text">{block.body}</p>
        <p className="mt-3 text-xs text-caisbe-muted">
          Complete this assignment offline / as instructed, then mark the lesson complete.
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

export default function CoursePlayerPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();
  const { user, loading } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [examMode, setExamMode] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<CourseDetail>(`/courses/${courseId}`);
      setCourse(data);
      const firstIncomplete =
        data.chapters.flatMap((c) => c.lessons).find((l) => !l.completed) ??
        data.chapters[0]?.lessons[0] ??
        null;
      setActiveLessonId((prev) => prev ?? firstIncomplete?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load course.");
    }
  }, [courseId]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const lessons = useMemo(() => {
    if (!course) return [] as Lesson[];
    return course.chapters.flatMap((c) => c.lessons);
  }, [course]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? null;

  async function markComplete() {
    if (!activeLesson) return;
    setBusy(true);
    try {
      await apiFetch(`/me/lessons/${activeLesson.id}/complete`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to mark complete.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading…</div>;
  }

  if (error && !course) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-sm text-caisbe-red">{error}</p>
        <Link href="/my-account" className="mt-4 inline-block text-sm text-caisbe-green">
          ← Back to My Account
        </Link>
      </div>
    );
  }

  if (!course) {
    return <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading course…</div>;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/my-account" className="text-sm text-caisbe-muted hover:text-caisbe-green">
        ← My Account
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{course.code}</p>
          <h1 className="font-display text-3xl font-semibold text-caisbe-green">{course.title}</h1>
          <p className="mt-1 text-sm text-caisbe-muted">Progress: {course.progress ?? 0}%</p>
        </div>
        {course.certificate_code ? (
          <Link
            href={`/my-account/certificates/${course.certificate_code}`}
            className="border-2 border-caisbe-green px-4 py-2 text-sm font-semibold uppercase text-caisbe-green"
          >
            View certificate
          </Link>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-caisbe-red">{error}</p> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4 border border-ifma-border p-4">
          {course.chapters.map((chapter) => (
            <div key={chapter.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                {chapter.title}
              </p>
              <ul className="mt-2 space-y-1">
                {chapter.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setExamMode(false);
                        setActiveLessonId(lesson.id);
                      }}
                      className={`w-full text-left text-sm ${
                        !examMode && activeLessonId === lesson.id
                          ? "font-semibold text-caisbe-green"
                          : "text-caisbe-text hover:text-caisbe-green"
                      }`}
                    >
                      {lesson.completed ? "✓ " : ""}
                      {lesson.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {course.final_exam ? (
            <button
              type="button"
              onClick={() => setExamMode(true)}
              className={`w-full text-left text-sm ${
                examMode ? "font-semibold text-caisbe-red" : "text-caisbe-text hover:text-caisbe-red"
              }`}
            >
              {course.exam_passed ? "✓ " : ""}
              {course.final_exam.title}
            </button>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-6">
          {examMode && course.final_exam ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{course.final_exam.title}</h2>
              <p className="text-sm text-caisbe-muted">
                Pass mark: {course.final_exam.pass_percent}%
              </p>
              {course.exam_passed ? (
                <p className="text-sm text-caisbe-green">
                  You already passed this exam.
                  {course.certificate_code ? (
                    <>
                      {" "}
                      <Link
                        href={`/my-account/certificates/${course.certificate_code}`}
                        className="font-semibold underline"
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
                    await load();
                    return result;
                  }}
                />
              )}
            </div>
          ) : activeLesson ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">{activeLesson.title}</h2>
              {activeLesson.blocks.map((block) => (
                <div key={block.id} className="border-b border-ifma-border-light pb-6">
                  <BlockView block={block} />
                </div>
              ))}
              <button
                type="button"
                disabled={busy || activeLesson.completed}
                onClick={() => void markComplete()}
                className="border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase text-white disabled:opacity-60"
              >
                {activeLesson.completed ? "Lesson completed" : busy ? "Saving…" : "Mark lesson complete"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-caisbe-muted">
              This course has no lessons yet. Check back after content is published.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
