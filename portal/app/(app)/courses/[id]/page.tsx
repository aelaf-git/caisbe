"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import QuizPlayer from "@/components/portal/QuizPlayer";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError } from "@/lib/auth";
import type { ContentBlock, CourseDetail, Lesson, QuizAttempt } from "@/lib/lms";
import { sanitizeContentBody } from "@/lib/sanitizeHtml";

type NavSelection =
  | { kind: "topic"; topicId: number }
  | { kind: "chapter-block"; blockId: number }
  | { kind: "exam" };

function BlockView({
  block,
  onQuizResult,
}: {
  block: ContentBlock;
  onQuizResult?: (result: QuizAttempt) => void;
}) {
  if (block.block_type === "text" || block.block_type === "subtopic") {
    return (
      <div className="prose prose-sm max-w-none text-caisbe-text">
        {block.title ? <h3 className="mb-2 text-lg font-semibold">{block.title}</h3> : null}
        {block.body ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeContentBody(block.body) }} />
        ) : null}
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

  if (block.block_type === "image" && block.url) {
    return (
      <div>
        {block.title ? <h3 className="mb-2 text-lg font-semibold">{block.title}</h3> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.url}
          alt={block.title || "Course image"}
          className="max-h-[480px] w-full max-w-3xl object-contain"
        />
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
          className="font-semibold text-caisbe-red hover:text-caisbe-red-dark"
        >
          Open PDF
        </a>
        <iframe title={block.title || "PDF"} src={block.url} className="mt-3 h-[480px] w-full border border-ifma-border" />
      </div>
    );
  }

  if ((block.block_type === "document" || block.block_type === "epub") && block.url) {
    return (
      <div>
        {block.title ? <h3 className="mb-2 text-lg font-semibold">{block.title}</h3> : null}
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-caisbe-red hover:text-caisbe-red-dark"
        >
          {block.block_type === "epub" ? "Download EPUB" : "Download document"}
        </a>
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
          className="font-semibold text-caisbe-red hover:text-caisbe-red-dark"
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
          Complete this assignment as instructed, then continue with the remaining topics.
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

function TopicSections({ topic }: { topic: Lesson }) {
  const sections = useMemo(() => {
    const top = topic.blocks
      .filter((b) => !b.parent_id && (b.block_type === "text" || b.block_type === "subtopic"))
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const mediaByParent = new Map<number, ContentBlock[]>();
    for (const block of topic.blocks) {
      if (
        block.parent_id &&
        ["video", "pdf", "document", "image", "epub", "link"].includes(block.block_type)
      ) {
        const list = mediaByParent.get(block.parent_id) ?? [];
        list.push(block);
        mediaByParent.set(block.parent_id, list);
      }
    }
    for (const list of mediaByParent.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    }
    return { top, mediaByParent };
  }, [topic.blocks]);

  return (
    <div className="space-y-6">
      {topic.body ? (
        <div
          className="prose prose-sm max-w-none text-caisbe-text"
          dangerouslySetInnerHTML={{ __html: sanitizeContentBody(topic.body) }}
        />
      ) : null}
      {sections.top.map((block) => (
        <div key={block.id} className="space-y-4 border-b border-ifma-border-light pb-6">
          <BlockView block={block} />
          {(sections.mediaByParent.get(block.id) ?? []).map((media) => (
            <BlockView key={media.id} block={media} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CoursePlayerPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();
  const { user, loading } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<NavSelection | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<CourseDetail>(`/courses/${courseId}`);
      setCourse(data);
      setSelection((prev) => {
        if (prev) return prev;
        const firstTopic =
          data.chapters.flatMap((c) => c.lessons).find((l) => !l.completed) ??
          data.chapters[0]?.lessons[0] ??
          null;
        if (firstTopic) return { kind: "topic", topicId: firstTopic.id };
        const firstBlock = data.chapters.flatMap((c) => c.blocks ?? [])[0];
        if (firstBlock) return { kind: "chapter-block", blockId: firstBlock.id };
        if (data.final_exam) return { kind: "exam" };
        return null;
      });
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

  const topics = useMemo(() => {
    if (!course) return [] as Lesson[];
    return course.chapters.flatMap((c) => c.lessons);
  }, [course]);

  const chapterBlocks = useMemo(() => {
    if (!course) return [] as ContentBlock[];
    return course.chapters.flatMap((c) => c.blocks ?? []);
  }, [course]);

  const activeTopic =
    selection?.kind === "topic" ? topics.find((t) => t.id === selection.topicId) ?? null : null;
  const activeChapterBlock =
    selection?.kind === "chapter-block"
      ? chapterBlocks.find((b) => b.id === selection.blockId) ?? null
      : null;

  async function markComplete() {
    if (!activeTopic) return;
    setBusy(true);
    try {
      await apiFetch(`/me/lessons/${activeTopic.id}/complete`, { method: "POST" });
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
      <div>
        <p className="text-sm text-caisbe-red">{error}</p>
        <BackButton href="/courses" className="mt-4" />
      </div>
    );
  }

  if (!course) {
    return <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading course…</div>;
  }

  return (
    <section>
      <BackButton href="/courses" />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{course.code}</p>
          <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">{course.title}</h1>
          <p className="mt-1 text-sm text-caisbe-muted">Progress: {course.progress ?? 0}%</p>
        </div>
        {course.certificate_code ? (
          <Link
            href={`/certificates/${course.certificate_code}`}
            className="rounded-md border-2 border-caisbe-red px-4 py-2 text-sm font-semibold uppercase text-caisbe-red hover:bg-caisbe-red hover:text-white"
          >
            View certificate
          </Link>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-caisbe-red">{error}</p> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4 border border-ifma-border bg-white p-4">
          {course.chapters.map((chapter) => (
            <div key={chapter.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                {chapter.title}
              </p>
              <ul className="mt-2 space-y-1">
                {chapter.lessons.map((topic) => (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: "topic", topicId: topic.id })}
                      className={`w-full text-left text-sm ${
                        selection?.kind === "topic" && selection.topicId === topic.id
                          ? "font-semibold text-caisbe-red"
                          : "text-caisbe-text hover:text-caisbe-red"
                      }`}
                    >
                      {topic.completed ? "✓ " : ""}
                      {topic.title}
                    </button>
                  </li>
                ))}
                {(chapter.blocks ?? []).map((block) => (
                  <li key={block.id}>
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: "chapter-block", blockId: block.id })}
                      className={`w-full text-left text-sm ${
                        selection?.kind === "chapter-block" && selection.blockId === block.id
                          ? "font-semibold text-caisbe-red"
                          : "text-caisbe-text hover:text-caisbe-red"
                      }`}
                    >
                      {block.block_type === "quiz" ? "Quiz: " : "Assignment: "}
                      {block.title || block.quiz?.title || block.block_type}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {course.final_exam ? (
            <button
              type="button"
              onClick={() => setSelection({ kind: "exam" })}
              className={`w-full text-left text-sm ${
                selection?.kind === "exam"
                  ? "font-semibold text-caisbe-red"
                  : "text-caisbe-text hover:text-caisbe-red"
              }`}
            >
              {course.exam_passed ? "✓ " : ""}
              {course.final_exam.title}
            </button>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-6">
          {selection?.kind === "exam" && course.final_exam ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{course.final_exam.title}</h2>
              <p className="text-sm text-caisbe-muted">Pass mark: {course.final_exam.pass_percent}%</p>
              {course.exam_passed ? (
                <p className="text-sm text-caisbe-red">
                  You already passed this exam.
                  {course.certificate_code ? (
                    <>
                      {" "}
                      <Link
                        href={`/certificates/${course.certificate_code}`}
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
          ) : activeChapterBlock ? (
            <div className="space-y-4">
              <BlockView block={activeChapterBlock} onQuizResult={() => void load()} />
            </div>
          ) : activeTopic ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">{activeTopic.title}</h2>
              <TopicSections topic={activeTopic} />
              <button
                type="button"
                disabled={busy || activeTopic.completed}
                onClick={() => void markComplete()}
                className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
              >
                {activeTopic.completed ? "Topic completed" : busy ? "Saving…" : "Mark topic complete"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-caisbe-muted">
              This course has no topics yet. Check back after content is published.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
