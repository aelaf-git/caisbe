"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import CertificatePreview from "@/components/certificates/CertificatePreview";
import ChapterCard from "@/components/lms/ChapterCard";
import CourseCoverField from "@/components/lms/CourseCoverField";
import { CourseStatusBadge, SaveStatus } from "@/components/lms/CourseEditorChrome";
import FinalExamEditor, { type ExamDraft } from "@/components/lms/FinalExamEditor";
import PassMarkControl from "@/components/lms/PassMarkControl";
import { emptyQuestion } from "@/components/lms/QuizQuestionEditor";
import Alert from "@/components/ui/Alert";
import BackButton from "@/components/ui/BackButton";
import Button, { buttonStyles } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
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
  cover_url: string | null;
  pass_percent: number;
  price_cents: number;
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
  const [savingChanges, setSavingChanges] = useState(false);
  const [status, setStatus] = useState("draft");
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [baselineKey, setBaselineKey] = useState(0);

  const [meta, setMeta] = useState<CourseMeta>({
    code: "",
    title: "",
    description: "",
    slug: "",
    cover_url: null,
    pass_percent: 70,
    price_cents: 9900,
  });
  const [coverSaving, setCoverSaving] = useState(false);

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
    setHasUnpublishedChanges(Boolean(data.has_unpublished_changes));
    setMeta({
      code: data.code,
      title: data.title,
      description: data.description,
      slug: data.slug,
      cover_url: data.cover_url ?? null,
      pass_percent: data.pass_percent,
      price_cents: data.price_cents ?? 9900,
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
    // Initial route-data hydration intentionally starts from this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setHasUnpublishedChanges(Boolean(updated.has_unpublished_changes));
    },
  });

  const sectionError = useMemo(
    () => metaAutosave.error,
    [metaAutosave.error],
  );

  async function commitCover(cover_url: string | null) {
    setMeta((current) => ({ ...current, cover_url }));
    setCoverSaving(true);
    setError(null);
    try {
      // Persist cover immediately as draft when published; live columns stay until Save changes.
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ cover_url }),
      });
      const savedCover = updated.cover_url ?? null;
      setCourse(updated);
      setStatus(updated.status);
      setHasUnpublishedChanges(Boolean(updated.has_unpublished_changes));
      let snapshot: CourseMeta | null = null;
      setMeta((current) => {
        snapshot = { ...current, cover_url: savedCover };
        return snapshot;
      });
      if (snapshot) await metaAutosave.flush(snapshot);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save cover image.");
      setMeta((current) => ({ ...current, cover_url: course?.cover_url ?? null }));
    } finally {
      setCoverSaving(false);
    }
  }

  async function saveChanges() {
    setSavingChanges(true);
    setError(null);
    try {
      await flushAll();
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}/save-changes`, {
        method: "POST",
      });
      hydrateFromCourse(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save changes.");
    } finally {
      setSavingChanges(false);
    }
  }

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
      hydrateFromCourse(updated);
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
  const needsPublishUpdate = isPublished && hasUnpublishedChanges;
  const draftLabel = autosaveLabel(overallStatus, {
    published: isPublished,
    hasUnpublishedChanges,
  });
  const saveBusy =
    savingChanges || publishing || overallStatus === "saving" || overallStatus === "pending";

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Loading course editor">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <EmptyState
        title="Course unavailable"
        description={error ?? "This course could not be found."}
        action={<BackButton href="/courses" label="Return to courses" />}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <BackButton href="/courses" label="Back to all courses" />

      <PageHeader
        eyebrow="Course workspace"
        title={meta.title || course.title}
        titleAccessory={<CourseStatusBadge status={status} />}
        description={`${meta.code || course.code} · Manage course details, curriculum, assessments, and certification.`}
        meta={<SaveStatus status={overallStatus} label={draftLabel} />}
        actions={
          <>
            <a
              href={`${process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002"}/courses/${courseId}`}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles({ variant: "secondary" })}
            >
              Preview as learner
            </a>
            <Button
              variant={needsPublishUpdate ? "primary" : "secondary"}
              onClick={() => void saveChanges()}
              disabled={saveBusy || (isPublished && !hasUnpublishedChanges && overallStatus === "idle")}
            >
              {savingChanges ? "Saving…" : "Save changes"}
            </Button>
            <Button
              variant={isPublished ? "secondary" : "primary"}
              onClick={() => void togglePublish()}
              disabled={saveBusy}
            >
              {publishing ? "Working…" : isPublished ? "Unpublish" : "Publish"}
            </Button>
          </>
        }
      />

      <div className="sticky top-16 z-20 -mx-4 border-y border-ifma-border bg-admin-canvas/95 px-4 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Tabs items={SECTION_NAV} value={activeSection} onChange={setActiveSection} ariaLabel="Course editor sections" />
        </div>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {sectionError ? <Alert tone="error">{sectionError}</Alert> : null}

      {showSection("details") ? (
      <Card id="details" className="scroll-mt-48 space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Course details</h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Edits autosave as a draft. Click Save changes to update the published course on the student portal.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Course code" hint="Updating the code also suggests a matching URL slug.">
            <input
              className={fieldClassName}
              value={meta.code}
              onChange={(e) => {
                const code = e.target.value;
                setMeta((m) => ({ ...m, code, slug: slugify(code) }));
              }}
              onBlur={() => void metaAutosave.flush()}
            />
          </FormField>
          <FormField label="URL slug">
            <input
              className={fieldClassName}
              value={meta.slug}
              onChange={(e) => setMeta((m) => ({ ...m, slug: e.target.value }))}
              onBlur={() => void metaAutosave.flush()}
              placeholder="auto from code"
            />
          </FormField>
        </div>
        <FormField label="Course title">
          <input
            className={fieldClassName}
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            onBlur={() => void metaAutosave.flush()}
          />
        </FormField>
        <FormField label="Description" hint="A concise overview shown to learners before they begin.">
          <textarea
            className={textAreaClassName}
            rows={4}
            value={meta.description}
            onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
            onBlur={() => void metaAutosave.flush()}
          />
        </FormField>
        <CourseCoverField
          value={meta.cover_url}
          onChange={(cover_url) => commitCover(cover_url)}
          onError={setError}
          saving={coverSaving}
        />
        <PassMarkControl
          value={meta.pass_percent}
          onChange={(pass_percent) => setMeta((current) => ({ ...current, pass_percent }))}
          onCommit={() => void metaAutosave.flush()}
          description="Minimum score required to complete the course and earn a certificate."
        />
        <FormField label="Course price (USD)" hint="Students pay this at checkout. Use promotions for discounts or complimentary enrollment.">
          <input
            type="number"
            min={0}
            step="0.01"
            className={fieldClassName}
            value={(meta.price_cents / 100).toFixed(2)}
            onChange={(e) =>
              setMeta((current) => ({
                ...current,
                price_cents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)),
              }))
            }
            onBlur={() => void metaAutosave.flush()}
          />
        </FormField>
      </Card>
      ) : null}

      {showSection("content") ? (
      <Card
        id="content"
        className="scroll-mt-48 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Course content</h2>
            <p className="mt-1 text-sm text-caisbe-muted">Build the curriculum chapter by chapter. Changes save automatically.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void addChapter()}
          >
            <span aria-hidden>+</span> Add chapter
          </Button>
        </div>
        {contentError ? <Alert tone="error">{contentError}</Alert> : null}
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
          {course.chapters.length === 0 ? (
            <EmptyState
              title="Start your curriculum"
              description="Add a chapter, then fill it with topics, notes, media, quizzes, and assignments."
              action={<Button onClick={() => void addChapter()}>Add first chapter</Button>}
            />
          ) : null}
        </div>
      </Card>
      ) : null}

      {showSection("exam") ? (
      <Card id="exam" className="scroll-mt-48 space-y-5">
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Final exam</h2>
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
      </Card>
      ) : null}

      {showSection("certificate") ? (
      <Card
        id="certificate"
        className="scroll-mt-48 space-y-4"
      >
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Certificate</h2>
        <p className="text-sm text-caisbe-muted">
          All courses use the standard CAISBE certificate design. When a student completes this course,
          a certificate is issued with their name, the course title below, the issue date, and a
          verification QR code.
        </p>
        <CertificatePreview kind="completion" courseTitle={meta.title || "Sample Course"} />
      </Card>
      ) : null}
    </div>
  );
}
