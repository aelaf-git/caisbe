"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import AssignmentReviewForm, { type AssignmentReviewPayload } from "@/components/lms/AssignmentReviewForm";
import { apiFetch, ApiError } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

type AssignmentSubmission = {
  id: number;
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

type StatusFilter = "under_review" | "passed" | "failed" | "all";

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

export default function AssignmentsPage() {
  const { notice, dialog } = useNoticeDialog();
  const [rows, setRows] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("under_review");
  const [busyId, setBusyId] = useState<number | null>(null);

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
    void load();
  }, [load]);

  async function review(id: number, payload: AssignmentReviewPayload) {
    setBusyId(id);
    try {
      const updated = await apiFetch<AssignmentSubmission>(`/admin/assignment-submissions/${id}/review`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRows((current) => {
        if (filter !== "all" && updated.status !== filter) {
          return current.filter((row) => row.id !== id);
        }
        return current.map((row) => (row.id === id ? updated : row));
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
        description="Review student assignment submissions and mark each as pass or fail."
      />

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
            className={`inline-flex h-10 items-center rounded-full border-2 px-4 text-sm font-bold transition ${
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
              return (
                <li key={row.id} className="space-y-3 px-4 py-5 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                        {row.course_code || "Course"}
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
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
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
                      key={`${row.id}-${row.status}-${row.score ?? ""}-${row.graded_at ?? ""}`}
                      pointsPossible={row.points_possible}
                      initialScore={row.score}
                      initialFeedback={row.feedback}
                      busy={busyId === row.id}
                      onReview={(payload) => void review(row.id, payload)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
