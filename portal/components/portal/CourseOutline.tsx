"use client";

import { useEffect, useMemo, useState } from "react";
import type { CourseDetail } from "@/lib/lms";
import { outlineNumber } from "@/lib/outlineNumber";
import {
  selectionsEqual,
  type NavSelection,
} from "@/components/portal/coursePlayerTypes";

function CompletedMark({ done }: { done: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
        done
          ? "border-caisbe-red bg-caisbe-red text-white"
          : "border-ifma-border bg-white text-transparent"
      }`}
      aria-hidden
    >
      ✓
    </span>
  );
}

function TypeIcon({ type }: { type: "lecture" | "quiz" | "assignment" | "exam" }) {
  const paths =
    type === "quiz"
      ? "M9 9h6M9 13h4M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      : type === "assignment"
        ? "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"
        : type === "exam"
          ? "M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"
          : "M4 6h16M4 12h10M4 18h16";
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-caisbe-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths} />
    </svg>
  );
}

function ItemButton({
  active,
  done,
  type,
  label,
  onClick,
}: {
  active: boolean;
  done: boolean;
  type: "lecture" | "quiz" | "assignment" | "exam";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm ${
        active
          ? "bg-caisbe-red/10 font-semibold text-caisbe-red"
          : "text-caisbe-text hover:bg-ifma-border-light"
      }`}
    >
      <CompletedMark done={done} />
      <TypeIcon type={type} />
      <span className="min-w-0 leading-snug">{label}</span>
    </button>
  );
}

export default function CourseOutline({
  course,
  selection,
  onSelect,
}: {
  course: CourseDetail;
  selection: NavSelection | null;
  onSelect: (next: NavSelection) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openChapters, setOpenChapters] = useState<number[]>(() => {
    const first = course.chapters[0]?.id;
    return first != null ? [first] : [];
  });

  const activeChapterId = useMemo(() => {
    if (!selection) return course.chapters[0]?.id ?? null;
    if (selection.kind === "topic") {
      return (
        course.chapters.find((chapter) => chapter.lessons.some((lesson) => lesson.id === selection.topicId))
          ?.id ?? null
      );
    }
    if (selection.kind === "chapter-block") {
      return (
        course.chapters.find((chapter) => (chapter.blocks ?? []).some((block) => block.id === selection.blockId))
          ?.id ?? null
      );
    }
    return null;
  }, [course.chapters, selection]);

  useEffect(() => {
    if (activeChapterId == null) return;
    setOpenChapters((current) =>
      current.includes(activeChapterId) ? current : [...current, activeChapterId],
    );
  }, [activeChapterId]);

  function toggleChapter(id: number) {
    setOpenChapters((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  }

  const list = (
    <nav className="space-y-1">
      {course.chapters.map((chapter, chapterIndex) => {
        const open = openChapters.includes(chapter.id);
        return (
          <div key={chapter.id} className="border-b border-ifma-border-light last:border-b-0">
            <button
              type="button"
              onClick={() => toggleChapter(chapter.id)}
              className="flex w-full items-center justify-between gap-2 px-2 py-3 text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                {chapterIndex + 1}. {chapter.title}
              </span>
              <span className="text-caisbe-muted" aria-hidden>
                {open ? "▾" : "▸"}
              </span>
            </button>
            {open ? (
              <ul className="space-y-0.5 pb-3">
                {chapter.lessons.map((topic, topicIndex) => (
                  <li key={topic.id}>
                    <ItemButton
                      type="lecture"
                      done={Boolean(topic.completed)}
                      active={selectionsEqual(selection, { kind: "topic", topicId: topic.id })}
                      label={`${outlineNumber(chapterIndex + 1, topicIndex + 1)} ${topic.title}`}
                      onClick={() => {
                        onSelect({ kind: "topic", topicId: topic.id });
                        setMobileOpen(false);
                      }}
                    />
                  </li>
                ))}
                {(chapter.blocks ?? [])
                  .filter((block) => block.block_type === "quiz" || block.block_type === "assignment")
                  .map((block) => (
                    <li key={block.id}>
                      <ItemButton
                        type={block.block_type === "quiz" ? "quiz" : "assignment"}
                        done={false}
                        active={selectionsEqual(selection, { kind: "chapter-block", blockId: block.id })}
                        label={block.title || block.quiz?.title || block.block_type}
                        onClick={() => {
                          onSelect({ kind: "chapter-block", blockId: block.id });
                          setMobileOpen(false);
                        }}
                      />
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        );
      })}
      {course.final_exam ? (
        <ItemButton
          type="exam"
          done={Boolean(course.exam_passed)}
          active={selectionsEqual(selection, { kind: "exam" })}
          label={course.final_exam.title}
          onClick={() => {
            onSelect({ kind: "exam" });
            setMobileOpen(false);
          }}
        />
      ) : null}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex w-full items-center justify-between border border-ifma-border bg-white px-4 py-3 text-sm font-semibold text-caisbe-text"
        >
          Course content
          <span aria-hidden>{mobileOpen ? "▴" : "▾"}</span>
        </button>
        {mobileOpen ? <div className="border border-t-0 border-ifma-border bg-white p-2">{list}</div> : null}
      </div>
      <aside className="sticky top-4 hidden max-h-[calc(100vh-6rem)] overflow-y-auto border border-ifma-border bg-white p-3 lg:block">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
          Course content
        </p>
        {list}
      </aside>
    </>
  );
}
