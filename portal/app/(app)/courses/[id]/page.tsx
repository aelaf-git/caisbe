"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import ContentProtectionShell from "@/components/portal/ContentProtectionShell";
import CourseOutline from "@/components/portal/CourseOutline";
import CoursePlayerHeader from "@/components/portal/CoursePlayerHeader";
import LessonStage from "@/components/portal/LessonStage";
import {
  selectionsEqual,
  type NavSelection,
  type PlaylistItem,
} from "@/components/portal/coursePlayerTypes";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError, type Course } from "@/lib/auth";
import { courseShortSummary } from "@/lib/courseSummary";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import type { ContentBlock, CourseDetail, Lesson, QuizAttempt } from "@/lib/lms";
import { outlineNumber } from "@/lib/outlineNumber";
import { selectionUnlocked } from "@/lib/courseAccess";
import { isAdminUpload, isLegacyChapterReading, readingsForChapter } from "@/lib/readings";

function buildPlaylist(course: CourseDetail): PlaylistItem[] {
  const items: PlaylistItem[] = [];
  for (const chapter of course.chapters) {
    for (const topic of chapter.lessons) {
      items.push({ kind: "topic", topicId: topic.id, chapterId: chapter.id });
    }
    if (readingsForChapter(chapter).length > 0) {
      items.push({ kind: "chapter-readings", chapterId: chapter.id });
    }
    for (const block of chapter.blocks ?? []) {
      if (block.block_type === "quiz" || block.block_type === "assignment") {
        items.push({ kind: "chapter-block", blockId: block.id, chapterId: chapter.id });
      }
    }
  }
  for (const row of course.direct_assignments ?? []) {
    items.push({ kind: "direct-assignment", assignmentId: row.direct_assignment_id });
  }
  if (course.final_exam) items.push({ kind: "exam" });
  return items;
}

export default function CoursePlayerPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();
  const { user, loading } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [notReady, setNotReady] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<NavSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<CourseDetail>(`/courses/${courseId}`);
      setNotReady(null);
      setCourse(data);
      setSelection((prev) => {
        if (prev) return prev;
        const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const requestedDirect = params ? Number(params.get("direct")) : NaN;
        if (Number.isFinite(requestedDirect) && requestedDirect > 0) {
          const match = (data.direct_assignments ?? []).find(
            (row) => row.direct_assignment_id === requestedDirect,
          );
          if (match) return { kind: "direct-assignment", assignmentId: match.direct_assignment_id };
        }
        const requested = params ? Number(params.get("block")) : NaN;
        if (Number.isFinite(requested) && requested > 0) {
          const match = data.chapters
            .flatMap((chapter) => chapter.blocks ?? [])
            .find(
              (block) =>
                block.id === requested &&
                (block.block_type === "assignment" || block.block_type === "quiz"),
            );
          if (match) return { kind: "chapter-block", blockId: match.id };
        }
        const firstTopic =
          data.chapters.flatMap((c) => c.lessons).find((l) => !l.completed) ??
          data.chapters[0]?.lessons[0] ??
          null;
        if (firstTopic) return { kind: "topic", topicId: firstTopic.id };
        const firstBlock = data.chapters.flatMap((c) =>
          (c.blocks ?? []).filter((b) => b.block_type === "quiz" || b.block_type === "assignment"),
        )[0];
        if (firstBlock) return { kind: "chapter-block", blockId: firstBlock.id };
        if (data.final_exam) return { kind: "exam" };
        return null;
      });
    } catch (err) {
      if (err instanceof ApiError && err.detail === "This course is not ready yet.") {
        const listed = await apiFetch<Course[]>("/courses", { auth: false }).catch(() => [] as Course[]);
        setCourse(null);
        setNotReady(
          listed.find((item) => item.id === courseId) ?? {
            id: courseId,
            code: "",
            title: "Course",
            description: "",
            slug: "",
            content_published: false,
          },
        );
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        if (err.detail.toLowerCase().includes("restricted")) {
          setError(err.detail);
          return;
        }
        router.replace(`/courses/${courseId}/checkout`);
        return;
      }
      setError(err instanceof ApiError ? err.detail : "Unable to load course.");
    }
  }, [courseId, router]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    setQuizPassed(false);
  }, [selection]);

  useEffect(() => {
    if (!outlineOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOutlineOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [outlineOpen]);

  const topics = useMemo(() => {
    if (!course) return [] as Lesson[];
    return course.chapters.flatMap((c) => c.lessons);
  }, [course]);

  const chapterBlocks = useMemo(() => {
    if (!course) return [] as ContentBlock[];
    return course.chapters.flatMap((c) =>
      (c.blocks ?? []).filter((b) => b.block_type === "quiz" || b.block_type === "assignment"),
    );
  }, [course]);

  const playlist = useMemo(() => (course ? buildPlaylist(course) : []), [course]);
  const playlistIndex = useMemo(() => {
    if (!selection) return -1;
    return playlist.findIndex((item) => selectionsEqual(selection, item));
  }, [playlist, selection]);

  const activeTopic =
    selection?.kind === "topic" ? topics.find((t) => t.id === selection.topicId) ?? null : null;
  const activeTopicChapter = useMemo(() => {
    if (!course || !activeTopic) return null;
    return (
      course.chapters.find((chapter) => chapter.lessons.some((lesson) => lesson.id === activeTopic.id)) ??
      null
    );
  }, [activeTopic, course]);
  const chapterMedia = useMemo(() => {
    const mediaTypes = new Set(["video", "pdf", "document", "image", "epub"]);
    return (activeTopicChapter?.blocks ?? [])
      .filter(
        (block) =>
          mediaTypes.has(block.block_type) &&
          isAdminUpload(block.url) &&
          block.block_type !== "reading" &&
          !isLegacyChapterReading(block),
      )
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [activeTopicChapter]);
  const activeTopicOutline = useMemo(() => {
    if (!course || !activeTopic) return "";
    for (let chapterIndex = 0; chapterIndex < course.chapters.length; chapterIndex += 1) {
      const topicIndex = course.chapters[chapterIndex].lessons.findIndex(
        (lesson) => lesson.id === activeTopic.id,
      );
      if (topicIndex >= 0) {
        return outlineNumber(chapterIndex + 1, topicIndex + 1);
      }
    }
    return "";
  }, [activeTopic, course]);
  const activeChapterBlock =
    selection?.kind === "chapter-block"
      ? chapterBlocks.find((b) => b.id === selection.blockId) ?? null
      : null;

  const assignmentAfterQuiz = useMemo((): NavSelection | null => {
    if (!course || selection?.kind !== "chapter-block" || activeChapterBlock?.block_type !== "quiz") return null;
    const chapter = course.chapters.find((item) =>
      (item.blocks ?? []).some((block) => block.id === activeChapterBlock.id),
    );
    const assignment = (chapter?.blocks ?? [])
      .filter((block) => block.block_type === "assignment")
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)[0];
    if (!assignment) return null;
    return { kind: "chapter-block", blockId: assignment.id };
  }, [activeChapterBlock, course, selection]);

  async function toggleTopicComplete() {
    if (!activeTopic) return;
    setBusy(true);
    try {
      if (activeTopic.completed) {
        await apiFetch(`/me/lessons/${activeTopic.id}/complete`, { method: "DELETE" });
      } else {
        await apiFetch(`/me/lessons/${activeTopic.id}/complete`, { method: "POST" });
      }
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : activeTopic.completed
            ? "Unable to mark incomplete."
            : "Unable to mark complete.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading…</div>;
  }

  if (notReady) {
    const cover = resolveUploadUrl(notReady.cover_url) ?? notReady.cover_url ?? null;
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <BackButton href="/courses" />
        <section className="space-y-6 border border-ifma-border bg-admin-surface p-5 shadow-brand-card md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <span className="relative h-48 w-full shrink-0 overflow-hidden rounded-md border border-ifma-border bg-[#fafaf8] sm:h-40 sm:w-64">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase tracking-wide text-caisbe-red">
                  {notReady.code.slice(0, 4) || "CAISBE"}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              {notReady.code ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                  {notReady.code}
                </p>
              ) : null}
              <h1 className="font-display text-2xl font-semibold text-caisbe-text-dark">{notReady.title}</h1>
              {notReady.description ? (
                <p className="text-sm leading-7 text-caisbe-muted">{courseShortSummary(notReady.description)}</p>
              ) : null}
              <p className="border border-caisbe-red/20 bg-white px-4 py-3 text-sm font-semibold leading-6 text-caisbe-text-dark">
                This course is not ready yet.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
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
    <section className="flex min-h-dvh flex-col bg-admin-canvas">
      <div className="sticky top-0 z-20">
        <CoursePlayerHeader
          code={course.code}
          title={course.title}
          progress={course.progress ?? 0}
          certificateCode={course.certificate_code}
          outlineOpen={outlineOpen}
          onToggleOutline={() => setOutlineOpen((open) => !open)}
        />
      </div>

      {error ? (
        <p className="border-b border-caisbe-red/20 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red md:px-6">
          {error}
        </p>
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <aside
          id="course-outline-panel"
          className={`z-10 overflow-hidden border-ifma-border-light bg-white transition-[width,transform,opacity] duration-200 ease-out ${
            outlineOpen
              ? "absolute inset-y-0 left-0 w-[min(20rem,88vw)] translate-x-0 border-r p-4 opacity-100 shadow-hopewell lg:static lg:w-[300px] lg:shrink-0 lg:shadow-none"
              : "pointer-events-none absolute inset-y-0 left-0 w-0 -translate-x-full border-0 p-0 opacity-0 lg:static lg:w-0 lg:translate-x-0"
          }`}
        >
          <div className={`h-full overflow-y-auto ${outlineOpen ? "" : "invisible"}`}>
            <CourseOutline
              course={course}
              selection={selection}
              onSelect={(next) => {
                setSelection(next);
                if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
                  setOutlineOpen(false);
                }
              }}
            />
          </div>
        </aside>

        {outlineOpen ? (
          <button
            type="button"
            aria-label="Close outline"
            className="absolute inset-0 z-[5] bg-caisbe-text/25 lg:hidden"
            onClick={() => setOutlineOpen(false)}
          />
        ) : null}

        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
          <div className={`mx-auto w-full transition-[max-width] duration-200 ${outlineOpen ? "max-w-4xl" : "max-w-5xl"}`}>
            <ContentProtectionShell
              enabled={course.content_protection !== false && selection?.kind !== "exam"}
            >
              <LessonStage
                course={course}
                courseId={courseId}
                selection={selection}
                activeTopic={activeTopic}
                activeTopicOutline={activeTopicOutline}
                activeChapterBlock={activeChapterBlock}
                chapterMedia={chapterMedia}
                busy={busy}
                onToggleTopicComplete={() => void toggleTopicComplete()}
                onReload={load}
                onQuizResult={(result: QuizAttempt | null) => {
                  setQuizPassed(Boolean(result?.passed));
                  if (result) void load();
                }}
                hasPrev={playlistIndex > 0}
                hasNext={
                  activeChapterBlock?.block_type === "quiz"
                    ? quizPassed &&
                      ((assignmentAfterQuiz != null && selectionUnlocked(course, assignmentAfterQuiz)) ||
                        (assignmentAfterQuiz == null &&
                          playlistIndex >= 0 &&
                          playlistIndex < playlist.length - 1 &&
                          selectionUnlocked(course, playlist[playlistIndex + 1])))
                    : playlistIndex >= 0 &&
                      playlistIndex < playlist.length - 1 &&
                      selectionUnlocked(course, playlist[playlistIndex + 1])
                }
                onReviewMaterials={() => {
                  const firstTopic = course.chapters.flatMap((chapter) => chapter.lessons)[0];
                  if (firstTopic) setSelection({ kind: "topic", topicId: firstTopic.id });
                }}
                onPrev={() => {
                  setQuizPassed(false);
                  if (playlistIndex > 0) setSelection(playlist[playlistIndex - 1]);
                }}
                onNext={() => {
                  if (activeChapterBlock?.block_type === "quiz") {
                    if (
                      quizPassed &&
                      assignmentAfterQuiz &&
                      selectionUnlocked(course, assignmentAfterQuiz)
                    ) {
                      setSelection(assignmentAfterQuiz);
                      return;
                    }
                    const next = playlist[playlistIndex + 1];
                    if (quizPassed && next && selectionUnlocked(course, next)) setSelection(next);
                    return;
                  }
                  const next = playlist[playlistIndex + 1];
                  if (next && selectionUnlocked(course, next)) setSelection(next);
                }}
              />
            </ContentProtectionShell>
          </div>
        </div>
      </div>
    </section>
  );
}
