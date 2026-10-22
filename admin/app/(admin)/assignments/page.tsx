"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import AssignmentReviewForm, { type AssignmentReviewPayload } from "@/components/lms/AssignmentReviewForm";
import { apiFetch, apiUpload, ApiError, type Course } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

type AssignmentSubmission = {
  id: number;
  source?: "chapter" | "direct";
  direct_assignment_id?: number | null;
  assignment_title: string;
  course_code: string;
  course_title: string;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  points_possible: number | null;
  is_late: boolean;
  graded_at: string | null;
  user_id: number | null;
  student_name: string | null;
  student_email: string | null;
  submitted_at: string | null;
};

type EnrollmentRow = {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  course_id: number;
  status: string;
};

type DirectAssignment = {
  id: number;
  title: string;
  course_code: string;
  recipient_count: number;
};

type StatusFilter = "under_review" | "passed" | "failed" | "all";
type PageTab = "inbox" | "upload";

function fileHref(url: string | null) {
  return resolveUploadUrl(url);
}

function isImageSubmission(url: string | null, name: string | null): boolean {
  const path = (url || name || "").split("?")[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/i.test(path);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function rowKey(row: AssignmentSubmission) {
  return `${row.source ?? "chapter"}-${row.id}`;
}

export default function AssignmentsPage() {
  const { notice, dialog } = useNoticeDialog();
  const [tab, setTab] = useState<PageTab>("inbox");
  const [rows, setRows] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("under_review");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      setRows(await apiFetch<AssignmentSubmission[]>(`/admin/assignment-submissions${query}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load assignment submissions.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (tab === "inbox") void load();
  }, [load, tab]);

  async function review(row: AssignmentSubmission, payload: AssignmentReviewPayload) {
    const key = rowKey(row);
    setBusyId(key);
    try {
      const path =
        row.source === "direct"
          ? `/admin/direct-assignment-submissions/${row.id}/review`
          : `/admin/assignment-submissions/${row.id}/review`;
      const updated = await apiFetch<AssignmentSubmission>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRows((current) => {
        if (filter !== "all" && updated.status !== filter) {
          return current.filter((item) => rowKey(item) !== key);
        }
        return current.map((item) => (rowKey(item) === key ? { ...item, ...updated } : item));
      });
      await notice({
        tone: "success",
        title: "Done",
        description: payload.status === "passed" ? "Submission marked as passed." : "Submission marked as failed.",
      });
    } catch (err) {
      await notice({
        tone: "error",
        title: "Something went wrong",
        description: err instanceof ApiError ? err.detail : "Unable to review the submission.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const under = rows.filter((row) => row.status === "under_review").length;
    return { under, total: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader
        eyebrow="Learning"
        title="Assignments"
        description="Review student submissions, or upload a handout and assign it to selected students."
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["inbox", "Inbox"],
            ["upload", "Upload & assign"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`inline-flex h-10 items-center rounded-none border-2 px-4 text-sm font-bold transition ${
              tab === value
                ? "border-caisbe-red bg-caisbe-red text-white"
                : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <UploadAssignPanel
          onCreated={async () => {
            setTab("inbox");
            setFilter("under_review");
            await notice({
              tone: "success",
              title: "Assigned",
              description: "Students can download the handout and upload their answers. New submissions will appear in the inbox.",
            });
          }}
        />
      ) : (
        <>
          {error ? <Alert tone="error">{error}</Alert> : null}

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["under_review", "Awaiting review"],
                ["passed", "Passed"],
                ["failed", "Failed"],
                ["all", "All"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`inline-flex h-10 items-center rounded-none border-2 px-4 text-sm font-bold transition ${
                  filter === value
                    ? "border-caisbe-red bg-caisbe-red text-white"
                    : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
                }`}
              >
                {label}
                {value === "under_review" && filter === "under_review" && !loading ? (
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{counts.under}</span>
                ) : null}
              </button>
            ))}
          </div>

          <Card padding="none" className="overflow-hidden">
            {loading ? (
              <div className="space-y-3 p-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={filter === "under_review" ? "No submissions awaiting review" : "No submissions"}
                  description="When students submit assignments from the portal, they appear here for grading."
                />
              </div>
            ) : (
              <ul className="divide-y divide-ifma-border-light">
                {rows.map((row) => {
                  const href = fileHref(row.file_url);
                  const key = rowKey(row);
                  return (
                    <li key={key} className="space-y-3 px-4 py-5 md:px-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                            {row.course_code || "Course"}
                            {row.source === "direct" ? " · Handout" : ""}
                          </p>
                          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
                            {row.assignment_title}
                          </h2>
                          <p className="text-sm text-caisbe-muted">{row.course_title}</p>
                          <p className="mt-2 text-sm text-caisbe-text">
                            <span className="font-semibold">{row.student_name || "Student"}</span>
                            {row.student_email ? (
                              <span className="text-caisbe-muted"> · {row.student_email}</span>
                            ) : null}
                            {row.submitted_at ? (
                              <span className="text-caisbe-muted">
                                {" "}
                                · {new Date(row.submitted_at).toLocaleString()}
                              </span>
                            ) : null}
                            {row.is_late ? <span className="font-semibold text-caisbe-red"> · Late</span> : null}
                            {row.points_possible != null && row.score != null ? (
                              <span className="text-caisbe-muted">
                                {" "}
                                · {row.score}/{row.points_possible}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-none px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                            row.status === "passed"
                              ? "bg-admin-success-soft text-admin-success"
                              : row.status === "failed"
                                ? "bg-caisbe-red/10 text-caisbe-red"
                                : "bg-[#f1f5f9] text-caisbe-muted"
                          }`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </div>

                      {href ? (
                        <div className="space-y-2">
                          {isImageSubmission(row.file_url, row.file_name) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={href}
                              alt={row.file_name || "Assignment submission"}
                              className="max-h-64 max-w-full rounded-md border border-ifma-border object-contain"
                            />
                          ) : null}
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-sm font-semibold text-caisbe-red hover:underline"
                          >
                            {row.file_name || "Open submitted file"}
                          </a>
                        </div>
                      ) : row.body ? (
                        <div className="rounded-md border border-ifma-border-light bg-[#f8fafc] px-4 py-3 text-sm whitespace-pre-wrap text-caisbe-text">
                          {row.body}
                        </div>
                      ) : (
                        <p className="text-sm text-caisbe-muted">No answer content attached.</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {row.user_id ? (
                          <Link
                            href={`/students/${row.user_id}`}
                            className="text-sm font-semibold text-caisbe-muted hover:text-caisbe-red"
                          >
                            View student
                          </Link>
                        ) : null}
                        <AssignmentReviewForm
                          key={`${key}-${row.status}-${row.score ?? ""}-${row.graded_at ?? ""}`}
                          pointsPossible={row.points_possible}
                          initialScore={row.score}
                          initialFeedback={row.feedback}
                          busy={busyId === key}
                          onReview={(payload) => void review(row, payload)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function UploadAssignPanel({ onCreated }: { onCreated: () => Promise<void> }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [recent, setRecent] = useState<DirectAssignment[]>([]);
  const [courseId, setCourseId] = useState<number | "">("");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [points, setPoints] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [courseRows, enrollmentRows, directRows] = await Promise.all([
          apiFetch<Course[]>("/admin/courses"),
          apiFetch<EnrollmentRow[]>("/admin/enrollments"),
          apiFetch<DirectAssignment[]>("/admin/direct-assignments"),
        ]);
        if (cancelled) return;
        setCourses(courseRows);
        setEnrollments(enrollmentRows);
        setRecent(directRows.slice(0, 8));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Unable to load courses and students.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const studentsForCourse = useMemo(() => {
    if (courseId === "") return [];
    const seen = new Set<number>();
    const rows: EnrollmentRow[] = [];
    for (const row of enrollments) {
      if (row.course_id !== courseId) continue;
      if (row.status !== "enrolled" && row.status !== "completed") continue;
      if (seen.has(row.student_id)) continue;
      seen.add(row.student_id);
      rows.push(row);
    }
    return rows.sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [courseId, enrollments]);

  useEffect(() => {
    setSelectedStudents([]);
  }, [courseId]);

  function toggleStudent(id: number) {
    setSelectedStudents((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleAll() {
    if (selectedStudents.length === studentsForCourse.length) {
      setSelectedStudents([]);
      return;
    }
    setSelectedStudents(studentsForCourse.map((row) => row.student_id));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (courseId === "") {
      setError("Choose a course.");
      return;
    }
    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }
    if (selectedStudents.length === 0) {
      setError("Select at least one student.");
      return;
    }
    if (!file) {
      setError("Choose a handout file to upload.");
      return;
    }
    setBusy(true);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, { folder: "courses/assignments" });
      const pointsValue = points.trim() === "" ? null : Number(points);
      if (pointsValue != null && (!Number.isFinite(pointsValue) || pointsValue < 0)) {
        setError("Points must be a non-negative number.");
        return;
      }
      await apiFetch<DirectAssignment>("/admin/direct-assignments", {
        method: "POST",
        body: JSON.stringify({
          course_id: courseId,
          title: title.trim(),
          body: body.trim() || null,
          file_url: uploaded.url,
          file_name: uploaded.filename,
          student_ids: selectedStudents,
          points_possible: pointsValue,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      setTitle("");
      setBody("");
      setPoints("");
      setDueAt("");
      setFile(null);
      setSelectedStudents([]);
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to create the assignment.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Upload &amp; assign</h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Upload a handout and assign it to one or more enrolled students. They download the file and upload their answers.
            </p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-caisbe-text">Course</span>
            <select
              required
              value={courseId === "" ? "" : String(courseId)}
              onChange={(event) => setCourseId(event.target.value ? Number(event.target.value) : "")}
              className="w-full rounded-none border-2 border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-caisbe-text">Students</span>
              {studentsForCourse.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-sm font-semibold text-caisbe-red hover:underline"
                >
                  {selectedStudents.length === studentsForCourse.length ? "Clear all" : "Select all"}
                </button>
              ) : null}
            </div>
            {courseId === "" ? (
              <p className="text-sm text-caisbe-muted">Choose a course to list enrolled students.</p>
            ) : studentsForCourse.length === 0 ? (
              <p className="text-sm text-caisbe-muted">No enrolled students in this course.</p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-none border border-ifma-border-light p-3">
                {studentsForCourse.map((row) => (
                  <li key={row.student_id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-none px-2 py-1.5 hover:bg-admin-surface-muted/50">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(row.student_id)}
                        onChange={() => toggleStudent(row.student_id)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-caisbe-text">{row.student_name}</span>
                        <span className="block text-xs text-caisbe-muted">{row.student_email}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {selectedStudents.length > 0 ? (
              <p className="text-xs text-caisbe-muted">{selectedStudents.length} selected</p>
            ) : null}
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-caisbe-text">Title</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-none border-2 border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red"
              placeholder="Assignment title"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-caisbe-text">Instructions (optional)</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              className="w-full rounded-none border-2 border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red"
              placeholder="Optional text instructions for students"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-caisbe-text">Points (optional)</span>
              <input
                type="number"
                min={0}
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                className="w-full rounded-none border-2 border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-caisbe-text">Due date (optional)</span>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="w-full rounded-none border-2 border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-caisbe-text">Handout file</span>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-caisbe-muted file:mr-3 file:rounded-none file:border-0 file:bg-caisbe-red/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-caisbe-red"
            />
            {file ? <p className="text-xs text-caisbe-muted">Selected: {file.name}</p> : null}
          </label>

          <button
            type="submit"
            disabled={busy}
            className="rounded-none border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-bold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create assignment"}
          </button>
        </form>
      </Card>

      {recent.length > 0 ? (
        <Card>
          <h3 className="font-display text-base font-semibold text-caisbe-text-dark">Recently assigned</h3>
          <ul className="mt-3 divide-y divide-ifma-border-light">
            {recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-semibold text-caisbe-text">{row.title}</span>
                <span className="text-caisbe-muted">
                  {row.course_code} · {row.recipient_count} student{row.recipient_count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
