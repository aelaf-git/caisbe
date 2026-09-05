"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import CertificatePreview from "@/components/certificates/CertificatePreview";
import ChapterCard from "@/components/lms/ChapterCard";
import FinalExamEditor, { type ExamDraft } from "@/components/lms/FinalExamEditor";
import { emptyQuestion } from "@/components/lms/QuizQuestionEditor";
import { AutosaveProvider, autosaveLabel, useAutosaveRegistry } from "@/hooks/autosaveContext";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, ApiError } from "@/lib/auth";
import type { CourseDetail } from "@/lib/lms";
import { numberedTitle, slugify } from "@/lib/ordinalTitles";

const SECTION_NAV = [
  { id: "all", label: "All" },
  { id: "details", label: "Details" },
  { id: "content", label: "Content" },
  { id: "exam", label: "Exam" },
  { id: "certificate", label: "Certificate" },
] as const;

type EditorSection = (typeof SECTION_NAV)[number]["id"];

type CourseMeta = {
  code: string;
  title: string;
  description: string;
  slug: string;
  pass_percent: number;
};

function metaReady(meta: CourseMeta): boolean {
  return meta.code.trim().length >= 2 && meta.title.trim().length >= 2 && meta.slug.trim().length >= 2;
}

export default function AdminCourseEditorPage() {
  return (
    <AutosaveProvider>
      <AdminCourseEditorInner />
    </AutosaveProvider>
  );
}

function AdminCourseEditorInner() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const { flushAll, overallStatus } = useAutosaveRegistry();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState("draft");
  const [baselineKey, setBaselineKey] = useState(0);

  const [meta, setMeta] = useState<CourseMeta>({
    code: "",
    title: "",
    description: "",
    slug: "",
    pass_percent: 70,
  });

  const [exam, setExam] = useState<ExamDraft>({
    title: "Final Exam",
    pass_percent: 70,
    questions: [emptyQuestion()],
  });

  const [activeSection, setActiveSection] = useState<EditorSection>("all");
  const [focusChapterId, setFocusChapterId] = useState<number | null>(null);

  function showSection(id: Exclude<EditorSection, "all">) {
    return activeSection === "all" || activeSection === id;
  }

  function hydrateFromCourse(data: CourseDetail) {
    setCourse(data);
    setStatus(data.status);
    setMeta({
      code: data.code,
      title: data.title,
      description: data.description,
      slug: data.slug,
      pass_percent: data.pass_percent,
    });
    setExam({
      title: data.final_exam?.title ?? "Final Exam",
      pass_percent: data.final_exam?.pass_percent ?? data.pass_percent,
      questions: data.final_exam?.questions?.length
        ? data.final_exam.questions.map((q) => ({
            prompt: q.prompt,
            sort_order: q.sort_order,
            choices: q.choices.map((c) => ({
              text: c.text,
              is_correct: Boolean(c.is_correct),
              sort_order: c.sort_order,
            })),
          }))
        : [emptyQuestion()],
    });
    setBaselineKey((n) => n + 1);
  }

  const refreshCourse = useCallback(async () => {
    const data = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`);
    setCourse(data);
    return data;
  }, [courseId]);

  const softReload = useCallback(async () => {
    try {
      await refreshCourse();
    } catch (err) {
      setContentError(err instanceof ApiError ? err.detail : "Unable to refresh course.");
    }
  }, [refreshCourse]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`);
      hydrateFromCourse(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load course.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const metaAutosave = useAutosave({
    id: `course-${courseId}-meta`,
    value: meta,
    baselineKey,
    enabled: Boolean(course) && metaReady(meta),
    save: async (next) => {
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      setCourse(updated);
      setStatus(updated.status);
    },
  });

  const sectionError = useMemo(
    () => metaAutosave.error,
    [metaAutosave.error],
  );

  async function togglePublish() {
    const next = status === "published" ? "draft" : "published";
    setPublishing(true);
    setError(null);
    try {
      await flushAll();
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setCourse(updated);
      setStatus(updated.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update status.");
    } finally {
      setPublishing(false);
    }
  }

  async function addChapter() {
    if (!course) return;
    setContentError(null);
    try {
      const created = await apiFetch<{ id: number }>(`/admin/courses/${courseId}/chapters`, {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled chapter",
          sort_order: course.chapters.length,
        }),
      });
      await apiFetch(`/admin/chapters/${created.id}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: numberedTitle("Topic", 0),
          body: "",
          sort_order: 0,
        }),
      });
      setFocusChapterId(created.id);
      await softReload();
    } catch (err) {
      setContentError(err instanceof ApiError ? err.detail : "Unable to add chapter.");
    }
  }

  const isPublished = status === "published";
  const draftLabel = autosaveLabel(overallStatus);

  if (loading) {
    return <p className="text-sm text-caisbe-muted">Loading course…</p>;
  }

  if (!course) {
    return <p className="text-sm text-caisbe-red">{error ?? "Course not found."}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-20 -mx-1 border-b border-ifma-border bg-[#f7f7f4]/95 px-1 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href="/courses" className="text-sm text-caisbe-muted hover:text-caisbe-green">
              ← All courses
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-caisbe-text-dark md:text-3xl">
                {meta.title || course.title}
              </h1>
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                  isPublished
                    ? "bg-caisbe-green/10 text-caisbe-green"
                    : "bg-ifma-border-light text-caisbe-muted"
                }`}
              >
                {status}
              </span>
              {draftLabel ? (
                <span
                  className={`text-xs font-medium ${
                    overallStatus === "error" ? "text-caisbe-red" : "text-caisbe-muted"
                  }`}
                >
                  {draftLabel}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void togglePublish()}
            disabled={publishing || overallStatus === "saving" || overallStatus === "pending"}
            className={`inline-flex items-center justify-center border-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide disabled:opacity-60 ${
              isPublished
                ? "border-caisbe-red/40 bg-white text-caisbe-muted hover:border-caisbe-red hover:text-caisbe-red"
                : "border-caisbe-green bg-caisbe-green text-white hover:bg-caisbe-green-mid"
            }`}
          >
            {publishing ? "Working…" : isPublished ? "Unpublish" : "Publish"}
          </button>
        </div>
        <nav className="mt-4 flex flex-wrap gap-1" aria-label="Course sections">
          {SECTION_NAV.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-caisbe-green/10 text-caisbe-green"
                    : "text-caisbe-muted hover:text-caisbe-green"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        {error ? <p className="mt-3 text-sm text-caisbe-red">{error}</p> : null}
        {sectionError ? <p className="mt-3 text-sm text-caisbe-red">{sectionError}</p> : null}
      </div>

      {showSection("details") ? (
      <section id="details" className="scroll-mt-36 space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Course details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-caisbe-text">Code</span>
            <input
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
              value={meta.code}
              onChange={(e) => {
                const code = e.target.value;
                setMeta((m) => ({ ...m, code, slug: slugify(code) }));
              }}
              onBlur={() => void metaAutosave.flush()}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-caisbe-text">Slug</span>
            <input
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
              value={meta.slug}
              onChange={(e) => setMeta((m) => ({ ...m, slug: e.target.value }))}
              onBlur={() => void metaAutosave.flush()}
              placeholder="auto from code"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-caisbe-text">Title</span>
          <input
            className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            onBlur={() => void metaAutosave.flush()}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-caisbe-text">Description</span>
          <textarea
            className="w-full rounded-md border border-ifma-border px-3 py-2 text-sm outline-none focus:border-caisbe-green"
            rows={3}
            value={meta.description}
            onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
            onBlur={() => void metaAutosave.flush()}
          />
        </label>
        <div className="rounded-md border border-ifma-border-light bg-[#fafaf8] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-caisbe-text">Pass mark</p>
              <p className="mt-1 text-xs text-caisbe-muted">
                Minimum score required to complete the course and earn a certificate.
              </p>
            </div>
            <div className="flex items-baseline gap-1 text-caisbe-green">
              <span className="font-display text-3xl font-semibold tabular-nums leading-none">
                {meta.pass_percent}
              </span>
              <span className="text-sm font-semibold">%</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={meta.pass_percent}
              onChange={(e) => setMeta((m) => ({ ...m, pass_percent: Number(e.target.value) }))}
              onMouseUp={() => void metaAutosave.flush()}
              onTouchEnd={() => void metaAutosave.flush()}
              className="h-2 min-w-[180px] flex-1 cursor-pointer appearance-none rounded-full bg-ifma-border accent-caisbe-green"
              aria-label="Pass percent"
            />
            <label className="relative block w-24 shrink-0">
              <span className="sr-only">Pass percent</span>
              <input
                type="number"
                min={0}
                max={100}
                value={meta.pass_percent}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setMeta((m) => ({
                    ...m,
                    pass_percent: Number.isFinite(next) ? Math.min(100, Math.max(0, next)) : 0,
                  }));
                }}
                onBlur={() => void metaAutosave.flush()}
                className="h-11 w-full rounded-md border border-ifma-border bg-white pr-8 pl-3 text-sm tabular-nums outline-none focus:border-caisbe-green"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-caisbe-muted">
                %
              </span>
            </label>
          </div>
        </div>
      </section>
      ) : null}

      {showSection("content") ? (
      <section
        id="content"
        className="scroll-mt-36 space-y-4 border border-ifma-border bg-white p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-caisbe-text">Chapters</h2>
            <p className="mt-1 text-xs text-caisbe-muted">
              Changes save automatically as a draft.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void addChapter()}
            className="border-2 border-caisbe-green px-4 py-2 text-sm font-semibold text-caisbe-green hover:bg-caisbe-green hover:text-white"
          >
            Add chapter
          </button>
        </div>
        {contentError ? <p className="text-sm text-caisbe-red">{contentError}</p> : null}
        <div className="space-y-4">
          {course.chapters.map((chapter, index) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              sequence={index + 1}
              defaultExpanded={chapter.id === focusChapterId || chapter.lessons.length === 0}
              onChanged={async () => {
                await softReload();
              }}
              onError={setContentError}
            />
          ))}
        </div>
      </section>
      ) : null}

      {showSection("exam") ? (
      <section id="exam" className="scroll-mt-36 space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Final exam</h2>
        <p className="text-sm text-caisbe-muted">
          Build the final exam here. Changes autosave when every question has a prompt,
          filled choices, and exactly one correct answer marked.
        </p>
        <FinalExamEditor
          courseId={courseId}
          baselineKey={baselineKey}
          exam={exam}
          onChange={setExam}
          onError={setContentError}
        />
      </section>
      ) : null}

      {showSection("certificate") ? (
      <section
        id="certificate"
        className="scroll-mt-36 space-y-4 border border-ifma-border bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-caisbe-text">Certificate</h2>
        <p className="text-sm text-caisbe-muted">
          All courses use the standard CAISBE certificate design. When a student completes this course,
          a certificate is issued with their name, the course title below, the issue date, and a
          verification QR code.
        </p>
        <CertificatePreview courseTitle={meta.title || "Sample Course"} />
      </section>
      ) : null}
    </div>
  );
}
