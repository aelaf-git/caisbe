"use client";

import { useCallback, useEffect, useState } from "react";
import AssignmentWorkTabs from "@/components/portal/AssignmentWorkTabs";
import { apiFetch, ApiError } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

type Attempt = {
  id: number;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string;
};

type Detail = {
  kind: "direct";
  block_id: number;
  direct_assignment_id: number;
  course_id: number;
  title: string;
  instructions_body: string | null;
  instructions_url: string | null;
  instructions_label: string | null;
  course_code: string;
  course_title: string;
  chapter_title: string;
  points_possible: number | null;
  due_at: string | null;
  bucket: string;
  review_status: string | null;
  score: number | null;
  feedback: string | null;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string | null;
  is_late: boolean;
  can_submit: boolean;
  can_resubmit: boolean;
  can_withdraw: boolean;
  unlocked: boolean;
  attempts: Attempt[];
};

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function fileHref(url: string | null) {
  return resolveUploadUrl(url) ?? url;
}

export default function DirectAssignmentStage({
  assignmentId,
  onChanged,
}: {
  assignmentId: number;
  onChanged: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await apiFetch<Detail>(`/me/direct-assignments/${assignmentId}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load this assignment.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-caisbe-muted">Loading assignment…</p>;
  }
  if (error || !detail) {
    return (
      <p className="rounded-md border border-caisbe-red/40 bg-caisbe-red/10 px-4 py-3 text-sm text-caisbe-red">
        {error || "Assignment not found."}
      </p>
    );
  }

  const score =
    detail.bucket === "evaluated"
      ? detail.points_possible != null && detail.score != null
        ? `${detail.score} / ${detail.points_possible}`
        : detail.review_status === "passed"
          ? "Pass"
          : detail.review_status === "failed"
            ? "Fail"
            : null
      : null;

  return (
    <AssignmentWorkTabs
      detail={detail}
      defaultTab="download"
      onChanged={async () => {
        await load();
        await onChanged();
      }}
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            {detail.course_code} · Assigned to you
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">{detail.title}</h2>
          {detail.points_possible != null || detail.due_at ? (
            <p className="mt-2 text-sm text-caisbe-muted">
              {detail.points_possible != null ? <span>{detail.points_possible} points</span> : null}
              {detail.points_possible != null && detail.due_at ? <span> · </span> : null}
              {detail.due_at ? <span>Due {formatWhen(detail.due_at)}</span> : null}
            </p>
          ) : null}
        </div>
      }
      statusPanel={
        <>
          {detail.bucket === "submitted" ? (
            <div className="rounded-md border border-admin-warning/40 bg-admin-warning-soft px-4 py-4">
              <p className="font-semibold text-caisbe-text-dark">Submitted — under review</p>
              <p className="mt-1 text-sm text-caisbe-text">Submitted {formatWhen(detail.submitted_at)}</p>
              {detail.file_url ? (
                <a
                  href={fileHref(detail.file_url) ?? detail.file_url}
                  className="mt-2 inline-flex text-sm font-semibold text-caisbe-red hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {detail.file_name || "Download your file"}
                </a>
              ) : detail.body ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-caisbe-text">{detail.body}</p>
              ) : null}
            </div>
          ) : null}
          {detail.bucket === "evaluated" ? (
            <div className="rounded-md border border-ifma-border px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Grades &amp; feedback</p>
              {score ? <p className="mt-2 text-lg font-semibold text-caisbe-text-dark">{score}</p> : null}
              {detail.feedback ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-caisbe-text">{detail.feedback}</p>
              ) : (
                <p className="mt-2 text-sm text-caisbe-muted">No written feedback was added.</p>
              )}
            </div>
          ) : null}
        </>
      }
      historyPanel={
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment history</h3>
          {detail.attempts.length === 0 ? (
            <p className="mt-2 text-sm text-caisbe-muted">No submissions yet.</p>
          ) : (
            <ol className="mt-2 space-y-2">
              {detail.attempts.map((attempt, index) => (
                <li key={attempt.id} className="rounded-md border border-ifma-border-light px-3 py-2 text-sm">
                  <p className="font-semibold text-caisbe-text">
                    Attempt {index + 1}
                    <span className="ml-2 font-normal text-caisbe-muted">{formatWhen(attempt.submitted_at)}</span>
                  </p>
                  {attempt.file_url ? (
                    <a
                      href={fileHref(attempt.file_url) ?? attempt.file_url}
                      className="text-caisbe-red hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {attempt.file_name || "File"}
                    </a>
                  ) : (
                    <p className="whitespace-pre-wrap text-caisbe-text">{attempt.body}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      }
    />
  );
}
