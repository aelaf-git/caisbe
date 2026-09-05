"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import CourseOutline from "@/components/portal/CourseOutline";
import CoursePlayerHeader from "@/components/portal/CoursePlayerHeader";
import LessonStage from "@/components/portal/LessonStage";
import {
  selectionsEqual,
  type NavSelection,
  type PlaylistItem,
} from "@/components/portal/coursePlayerTypes";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError } from "@/lib/auth";
import type { ContentBlock, CourseDetail, Lesson } from "@/lib/lms";
import { outlineNumber } from "@/lib/outlineNumber";

function buildPlaylist(course: CourseDetail): PlaylistItem[] {
  const items: PlaylistItem[] = [];
  for (const chapter of course.chapters) {
    for (const topic of chapter.lessons) {
      items.push({ kind: "topic", topicId: topic.id, chapterId: chapter.id });
    }
    for (const block of chapter.blocks ?? []) {
      if (block.block_type === "quiz" || block.block_type === "assignment") {
        items.push({ kind: "chapter-block", blockId: block.id, chapterId: chapter.id });
      }
    }
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
        const firstBlock = data.chapters.flatMap((c) =>
          (c.blocks ?? []).filter((b) => b.block_type === "quiz" || b.block_type === "assignment"),
        )[0];
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
    const mediaTypes = new Set(["video", "pdf", "document", "image", "epub", "link"]);
    return (activeTopicChapter?.blocks ?? [])
      .filter((block) => mediaTypes.has(block.block_type))
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
    <section className="space-y-5">
      <div className="sticky top-0 z-10 bg-[#f7f7f5] pb-1">
        <CoursePlayerHeader
          code={course.code}
          title={course.title}
          progress={course.progress ?? 0}
          certificateCode={course.certificate_code}
        />
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <CourseOutline course={course} selection={selection} onSelect={setSelection} />
        <LessonStage
          course={course}
          courseId={courseId}
          selection={selection}
          activeTopic={activeTopic}
          activeTopicOutline={activeTopicOutline}
          activeChapterBlock={activeChapterBlock}
          chapterMedia={chapterMedia}
          busy={busy}
          onMarkComplete={() => void markComplete()}
          onReload={load}
          hasPrev={playlistIndex > 0}
          hasNext={playlistIndex >= 0 && playlistIndex < playlist.length - 1}
          onPrev={() => {
            if (playlistIndex > 0) setSelection(playlist[playlistIndex - 1]);
          }}
          onNext={() => {
            if (playlistIndex >= 0 && playlistIndex < playlist.length - 1) {
              setSelection(playlist[playlistIndex + 1]);
            }
          }}
        />
      </div>
    </section>
  );
}
