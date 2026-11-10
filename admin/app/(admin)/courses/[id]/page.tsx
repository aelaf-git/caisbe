"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import CertificatePreview from "@/components/certificates/CertificatePreview";
import ChapterCard from "@/components/lms/ChapterCard";
import CourseCoverField from "@/components/lms/CourseCoverField";
import { CourseStatusBadge, SaveStatus } from "@/components/lms/CourseEditorChrome";
import EditorActionBar from "@/components/lms/EditorActionBar";
import FinalExamEditor, { type ExamDraft } from "@/components/lms/FinalExamEditor";
import { emptyQuestion } from "@/components/lms/QuizQuestionEditor";
import SectionActions from "@/components/lms/SectionActions";
import FrenchTranslationPanel from "@/components/translations/FrenchTranslationPanel";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import {
  AutosaveProvider,
  autosaveLabel,
  isContentUnit,
  isCourseInfoUnit,
  useAutosaveRegistry,
  type AutosaveStatus,
} from "@/hooks/autosaveContext";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, ApiError } from "@/lib/auth";
import type { CertificateTemplate, CourseDetail } from "@/lib/lms";
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
  price_cents: number;
  content_protection: boolean;
};

function metaReady(meta: CourseMeta): boolean {
  return meta.code.trim().length >= 2 && meta.title.trim().length >= 2 && meta.slug.trim().length >= 2;
}

type SectionBusy = "save" | "publish" | "toggle" | null;

const LESSONS_LOCKED = "Publish the course info before publishing chapters and exams.";

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
  const { flushWhere, overallStatus, statusFor, errorFor, unitStatuses } = useAutosaveRegistry();
  const { notice, dialog: noticeDialog } = useNoticeDialog();

  const showError = useCallback(
    (message: string) => {
      void notice({ tone: "error", title: "Something went wrong", description: message });
    },
    [notice],
  );

  const showSuccess = useCallback(
    (message: string) => {
      void notice({ tone: "success", title: "Done", description: message });
    },
    [notice],
  );

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoBusy, setInfoBusy] = useState<SectionBusy>(null);
  const [contentBusy, setContentBusy] = useState<SectionBusy>(null);
  const [status, setStatus] = useState("draft");
  const [contentPublished, setContentPublished] = useState(true);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [hasUnpublishedContentChanges, setHasUnpublishedContentChanges] = useState(false);
  const [baselineKey, setBaselineKey] = useState(0);

  const [meta, setMeta] = useState<CourseMeta>({
    code: "",
    title: "",
    description: "",
    slug: "",
    cover_url: null,
    price_cents: 9900,
    content_protection: true,
  });
  const [coverSaving, setCoverSaving] = useState(false);

  const [exam, setExam] = useState<ExamDraft>({
    title: "Final Exam",
    pass_percent: 70,
    time_limit_minutes: null,
    questions_to_appear: null,
    exam_wait_days: 30,
    secure_mode: true,
    max_integrity_violations: 3,
    questions: [emptyQuestion()],
  });

  const [activeSection, setActiveSection] = useState<EditorSection>("all");
  const [focusChapterId, setFocusChapterId] = useState<number | null>(null);
  const [programMode, setProgramMode] = useState<"automatic" | "manual">("automatic");
  const [programName, setProgramName] = useState("");
  const [programSaving, setProgramSaving] = useState(false);
  const programSaveSeq = useRef(0);

  function showSection(id: Exclude<EditorSection, "all">) {
    return activeSection === "all" || activeSection === id;
  }

  function applyFlags(data: CourseDetail) {
    setStatus(data.status);
    setContentPublished(data.content_published !== false);
    setHasUnpublishedChanges(Boolean(data.has_unpublished_changes));
    setHasUnpublishedContentChanges(Boolean(data.has_unpublished_content_changes));
  }

  function hydrateFromCourse(data: CourseDetail) {
    setCourse(data);
    applyFlags(data);
    setMeta({
      code: data.code,
      title: data.title,
      description: data.description,
      slug: data.slug,
      cover_url: data.cover_url ?? null,
      price_cents: data.price_cents ?? 9900,
      content_protection: data.content_protection !== false,
    });
    setExam({
      title: data.final_exam?.title ?? "Final Exam",
      pass_percent: data.final_exam?.pass_percent ?? data.pass_percent,
      time_limit_minutes: data.final_exam?.time_limit_minutes ?? null,
      questions_to_appear: data.final_exam?.questions_to_appear ?? null,
      exam_wait_days: data.final_exam?.exam_wait_days ?? 30,
      secure_mode: data.final_exam?.secure_mode !== false,
      max_integrity_violations: data.final_exam?.max_integrity_violations ?? 3,
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
    const storedName = data.certificate_template?.program_name?.trim() ?? "";
    setProgramMode(storedName ? "manual" : "automatic");
    setProgramName(storedName);
    setBaselineKey((n) => n + 1);
  }

  const refreshCourse = useCallback(async () => {
    const data = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`);
    setCourse(data);
    setHasUnpublishedContentChanges(Boolean(data.has_unpublished_content_changes));
    return data;
  }, [courseId]);

  const softReload = useCallback(async () => {
    try {
      await refreshCourse();
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to refresh course.");
    }
  }, [refreshCourse, showError]);

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
      applyFlags(updated);
    },
  });

  const isPublished = status === "published";
  const contentLive = isPublished && contentPublished;
  const infoStatus: AutosaveStatus = statusFor(isCourseInfoUnit);
  const contentStatus: AutosaveStatus = statusFor(isContentUnit);
  const infoError = errorFor(isCourseInfoUnit);
  const contentError = errorFor(isContentUnit);

  // Content units write to live rows but students read the published snapshot,
  // so a content save while lessons are live means there are staged edits.
  const previousUnitStatuses = useRef<Record<string, AutosaveStatus>>({});
  useEffect(() => {
    const previous = previousUnitStatuses.current;
    previousUnitStatuses.current = unitStatuses;
    if (!contentLive) return;
    const justSaved = Object.entries(unitStatuses).some(
      ([id, current]) =>
        isContentUnit(id) && current === "saved" && previous[id] === "saving",
    );
    if (justSaved) setHasUnpublishedContentChanges(true);
  }, [unitStatuses, contentLive]);

  // Warn before leaving while an autosave is still pending or in flight.
  useEffect(() => {
    const unsaved = overallStatus === "pending" || overallStatus === "saving";
    if (!unsaved) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [overallStatus]);

  async function commitCover(cover_url: string | null) {
    setMeta((current) => ({ ...current, cover_url }));
    setCoverSaving(true);
    try {
      // Persist cover immediately as draft when published; live columns stay until Save changes.
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ cover_url }),
      });
      const savedCover = updated.cover_url ?? null;
      setCourse(updated);
      applyFlags(updated);
      let snapshot: CourseMeta | null = null;
      setMeta((current) => {
        snapshot = { ...current, cover_url: savedCover };
        return snapshot;
      });
      if (snapshot) await metaAutosave.flush(snapshot);
      showSuccess("Cover image saved.");
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to save cover image.");
      setMeta((current) => ({ ...current, cover_url: course?.cover_url ?? null }));
    } finally {
      setCoverSaving(false);
    }
  }

  // --- Course info section ---

  async function saveInfo() {
    setInfoBusy("save");
    try {
      await flushWhere(isCourseInfoUnit);
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to save course info.");
    } finally {
      setInfoBusy(null);
    }
  }

  async function publishInfoChanges() {
    setInfoBusy("publish");
    try {
      await flushWhere(isCourseInfoUnit);
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}/save-changes`, {
        method: "POST",
      });
      hydrateFromCourse(updated);
      showSuccess("Course info changes are now live.");
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to publish course info changes.");
    } finally {
      setInfoBusy(null);
    }
  }

  async function toggleListing() {
    const next = status === "published" ? "draft" : "published";
    setInfoBusy("toggle");
    try {
      await flushWhere(isCourseInfoUnit);
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      hydrateFromCourse(updated);
      showSuccess(next === "published" ? "Course info published." : "Course info unpublished.");
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to update the listing.");
    } finally {
      setInfoBusy(null);
    }
  }

  // --- Lessons and exam section ---

  async function saveContent() {
    setContentBusy("save");
    try {
      await flushWhere(isContentUnit);
      await refreshCourse();
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to save lessons and exam.");
    } finally {
      setContentBusy(null);
    }
  }

  async function publishContentChanges() {
    setContentBusy("publish");
    try {
      await flushWhere(isContentUnit);
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}/publish-content`, {
        method: "POST",
      });
      hydrateFromCourse(updated);
      showSuccess("Lessons and exam changes are now live for students.");
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to publish lessons and exam.");
    } finally {
      setContentBusy(null);
    }
  }

  async function toggleLessons() {
    const next = !contentLive;
    if (next && !isPublished) {
      showError(LESSONS_LOCKED);
      return;
    }
    setContentBusy("toggle");
    try {
      await flushWhere(isContentUnit);
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ content_published: next }),
      });
      hydrateFromCourse(updated);
      showSuccess(next ? "Lessons and exam published." : "Lessons and exam closed.");
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to update lesson access.");
    } finally {
      setContentBusy(null);
    }
  }

  async function addChapter() {
    if (!course) return;
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
      showSuccess("Chapter added.");
    } catch (err) {
      showError(err instanceof ApiError ? err.detail : "Unable to add chapter.");
    }
  }

  async function saveProgramName(next: string) {
    const cleaned = next.trim();
    const seq = programSaveSeq.current + 1;
    programSaveSeq.current = seq;
    setProgramSaving(true);
    try {
      const saved = await apiFetch<CertificateTemplate>(
        `/admin/courses/${courseId}/certificate-template`,
        {
          method: "PUT",
          body: JSON.stringify({ program_name: cleaned }),
        },
      );
      if (programSaveSeq.current !== seq) return;
      const stored = saved.program_name?.trim() ?? "";
      setProgramMode(stored ? "manual" : "automatic");
      setProgramName(stored);
      setCourse((current) => (current ? { ...current, certificate_template: saved } : current));
    } catch (err) {
      if (programSaveSeq.current !== seq) return;
      showError(err instanceof ApiError ? err.detail : "Unable to save the certificate name.");
    } finally {
      if (programSaveSeq.current === seq) setProgramSaving(false);
    }
  }

  const draftLabel = autosaveLabel(overallStatus, {
    published: isPublished,
    hasUnpublishedChanges: hasUnpublishedChanges || (contentLive && hasUnpublishedContentChanges),
    reason: errorFor(() => true),
  });
  const anyBusy = infoBusy !== null || contentBusy !== null;

  const infoSection = {
    id: "course-info",
    label: "Course info",
    live: isPublished,
    autosaveStatus: infoStatus,
    failureReason: infoError,
    hasStagedChanges: hasUnpublishedChanges,
    onSave: () => void saveInfo(),
    onPublishChanges: () => void publishInfoChanges(),
    publishLabel: "Publish course info",
    unpublishLabel: "Unpublish course info",
    onTogglePublish: () => void toggleListing(),
    busy: infoBusy,
    disabled: anyBusy && infoBusy === null,
  };

  const contentSection = {
    id: "lessons-exam",
    label: "Lessons and exam",
    live: contentLive,
    autosaveStatus: contentStatus,
    failureReason: contentError,
    hasStagedChanges: hasUnpublishedContentChanges,
    onSave: () => void saveContent(),
    onPublishChanges: () => void publishContentChanges(),
    publishLabel: "Publish lessons and exam",
    unpublishLabel: "Close lessons and exam",
    onTogglePublish: () => void toggleLessons(),
    busy: contentBusy,
    disabled: anyBusy && contentBusy === null,
    lockedReason: isPublished ? null : LESSONS_LOCKED,
  };

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

  const printedProgramName =
    programMode === "manual" && programName.trim()
      ? programName.trim()
      : meta.title.trim() || "Sample Course";

  return (
    <div className="space-y-6 pb-12">
      {noticeDialog}
      <BackButton href="/courses" label="Back to all courses" />

      <PageHeader
        eyebrow="Course workspace"
        title={meta.title || course.title}
        titleAccessory={<CourseStatusBadge status={status} contentPublished={contentPublished} />}
        description={`${meta.code || course.code} · Manage course details, curriculum, assessments, and certification.`}
        meta={<SaveStatus status={overallStatus} label={draftLabel} />}
      />

      <div className="sticky top-16 z-20 -mx-4 border-y border-ifma-border bg-admin-canvas/95 px-4 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Tabs items={SECTION_NAV} value={activeSection} onChange={setActiveSection} ariaLabel="Course editor sections" />
        </div>
      </div>

      {showSection("details") ? (
      <Card id="details" className="scroll-mt-48 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Course info</h2>
            <p className="mt-1 max-w-2xl text-sm text-caisbe-muted">
              The cover, title and short description shown on the public site and in the student catalog. Publishing course info does not open chapters or the exam.
            </p>
            <p className="mt-1 max-w-2xl text-sm text-caisbe-muted">
              Autosaves as you type. Save confirms the draft. Publish changes sends it to students.
            </p>
          </div>
          <SectionActions {...infoSection} />
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
        <FormField
          label="Description"
          hint="Public short summary visitors see before they sign in and buy. Keep it to a few sentences."
        >
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
          onError={showError}
          saving={coverSaving}
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
        <FormField
          label="Protect course content"
          hint="Blocks copy/paste and hides lesson content when the student leaves the tab. Applies immediately (does not wait for Save changes). Final exams use Secure exam mode separately."
        >
          <label className="mt-1 flex items-center gap-2 text-sm text-caisbe-text">
            <input
              type="checkbox"
              checked={meta.content_protection}
              onChange={(e) => {
                setMeta((current) => ({ ...current, content_protection: e.target.checked }));
                void metaAutosave.flush({ ...meta, content_protection: e.target.checked });
              }}
            />
            Enable content protection for enrolled students
          </label>
        </FormField>
        <FrenchTranslationPanel
          entityType="course"
          entityId={courseId}
          english={{ title: meta.title, description: meta.description }}
          title="French (FR) — public catalog"
          fields={[
            { name: "title", label: "Title" },
            { name: "description", label: "Teaser description", kind: "textarea", rows: 4 },
          ]}
        />
      </Card>
      ) : null}

      {activeSection === "all" || activeSection === "content" || activeSection === "exam" || activeSection === "certificate" ? (
      <Card id="lessons-exam" className="scroll-mt-48 space-y-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Lessons and exam</h2>
            <p className="mt-1 max-w-2xl text-sm text-caisbe-muted">
              {contentLive
                ? "Chapters, quizzes, assignments and the final exam are open to enrolled students. Edits below stay hidden until you publish changes."
                : isPublished
                  ? "Publish lessons and exam to open chapters, quizzes, assignments, and the final exam for enrolled students."
                  : LESSONS_LOCKED}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-caisbe-muted">
              Autosaves as you type. Save confirms the draft. Publish changes sends it to students.
            </p>
          </div>
          <SectionActions {...contentSection} />
        </div>
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
            <p className="mt-1 text-sm text-caisbe-muted">
              Build the curriculum chapter by chapter. Changes autosave as a draft
              {contentLive ? " and reach students when you publish changes." : "."}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void addChapter()}
          >
            <span aria-hidden>+</span> Add chapter
          </Button>
        </div>
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
              onError={showError}
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
          Build the final exam here. Set the pass mark and, if you want, a time limit.
          Students who score below the pass mark can retake it. Correct answers stay hidden.
          Changes autosave when every question has a prompt, filled choices, and exactly one correct answer marked
          {contentLive ? ", and reach students when you publish changes." : "."}
        </p>
        <FinalExamEditor
          courseId={courseId}
          baselineKey={baselineKey}
          exam={exam}
          onChange={setExam}
          onError={showError}
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
          All courses use the standard CAISBE certificate design. The program name prints on its own
          line under the student name. Certificates already issued pick up a saved name the next time
          they are opened.
        </p>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-caisbe-text">Name on the certificate</legend>
          <label className="flex items-start gap-2 text-sm text-caisbe-text">
            <input
              type="radio"
              name="certificate-program-mode"
              className="mt-1"
              checked={programMode === "automatic"}
              disabled={programSaving}
              onChange={() => {
                setProgramMode("automatic");
                setProgramName("");
                void saveProgramName("");
              }}
            />
            <span>
              <span className="font-medium">Automatic</span>
              <span className="mt-0.5 block text-caisbe-muted">
                Prints the published course title. Publish a renamed course and every issued certificate
                shows that name.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-caisbe-text">
            <input
              type="radio"
              name="certificate-program-mode"
              className="mt-1"
              checked={programMode === "manual"}
              disabled={programSaving}
              onChange={() => setProgramMode("manual")}
            />
            <span>
              <span className="font-medium">Manual</span>
              <span className="mt-0.5 block text-caisbe-muted">
                Prints the exact wording you type, such as Real Estate Education when the course is
                titled Real Estate Course.
              </span>
            </span>
          </label>
          {programMode === "manual" ? (
            <FormField
              label="Name printed on the certificate"
              hint="Saved as soon as you leave the field. Clearing it returns to the course title."
            >
              <input
                value={programName}
                maxLength={255}
                placeholder={meta.title.trim() || "Real Estate Education"}
                className={fieldClassName}
                disabled={programSaving}
                onChange={(event) => setProgramName(event.target.value)}
                onBlur={() => void saveProgramName(programName)}
              />
            </FormField>
          ) : null}
        </fieldset>
        <CertificatePreview kind="completion" courseTitle={printedProgramName} />
      </Card>
      ) : null}

      <EditorActionBar sections={[infoSection, contentSection]} />
    </div>
  );
}
