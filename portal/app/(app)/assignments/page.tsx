"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AssignmentWorkTabs from "@/components/portal/AssignmentWorkTabs";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

type Bucket = "all" | "pending" | "submitted" | "evaluated";

type AssignmentRow = {
  kind?: "chapter" | "direct";
  block_id: number;
  direct_assignment_id?: number | null;
  course_id: number;
  title: string;
  course_code: string;
  course_title: string;
  chapter_title: string;
  due_at: string | null;
  bucket: "pending" | "submitted" | "evaluated";
  review_status: string | null;
  score: number | null;
  points_possible: number | null;
  submitted_at: string | null;
  is_late: boolean;
  unlocked: boolean;
};

type Attempt = {
  id: number;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string;
};

type AssignmentDetail = {
  kind?: "chapter" | "direct";
  block_id: number;
  direct_assignment_id?: number | null;
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

function rowKey(row: Pick<AssignmentRow, "kind" | "block_id" | "direct_assignment_id">) {
  if (row.kind === "direct" && row.direct_assignment_id) return `direct:${row.direct_assignment_id}`;
  return `chapter:${row.block_id}`;
}

function detailPath(row: Pick<AssignmentRow, "kind" | "block_id" | "direct_assignment_id">) {
  if (row.kind === "direct" && row.direct_assignment_id) {
    return `/me/direct-assignments/${row.direct_assignment_id}`;
  }
  return `/me/assignments/${row.block_id}`;
}

const FILTERS: { id: Bucket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "submitted", label: "Submitted" },
  { id: "evaluated", label: "Evaluated" },
];

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function scoreText(row: Pick<AssignmentRow, "bucket" | "review_status" | "score" | "points_possible">) {
  if (row.bucket !== "evaluated") return "—";
  if (row.points_possible != null && row.score != null) return `${row.score} / ${row.points_possible}`;
  if (row.review_status === "passed") return "Pass";
  if (row.review_status === "failed") return "Fail";
  return "—";
}

function statusLabel(bucket: string) {
  if (bucket === "pending") return "Pending";
  if (bucket === "submitted") return "Submitted";
  if (bucket === "evaluated") return "Evaluated";
  return bucket;
}

function emptyCopy(filter: Bucket) {
  if (filter === "pending") {
    return { title: "No pending assignments", body: "You have nothing left to submit." };
  }
  if (filter === "submitted") {
    return {
      title: "No submissions in review",
      body: "Work you send in will show here until it is evaluated.",
    };
  }
  if (filter === "evaluated") {
    return {
      title: "No evaluated assignments",
      body: "Scores and feedback appear here after an instructor reviews your work.",
    };
  }
  return { title: "No assignments yet", body: "Assignments from your courses will show up here." };
}

function fileHref(url: string | null) {
  return resolveUploadUrl(url) ?? url;
}

function isOverdue(row: Pick<AssignmentRow, "bucket" | "due_at">) {
  if (row.bucket !== "pending" || !row.due_at) return false;
  const due = new Date(row.due_at).getTime();
  return !Number.isNaN(due) && due < Date.now();
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-caisbe-muted">Loading assignments…</p>}>
      <AssignmentsWorkspace />
    </Suspense>
  );
}

function AssignmentsWorkspace() {
  const searchParams = useSearchParams();
  const openedFromQuery = useRef(false);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [filter, setFilter] = useState<Bucket>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiFetch<AssignmentRow[]>("/me/assignments"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openDetail = useCallback(async (row: AssignmentRow) => {
    setSelectedKey(rowKey(row));
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetail(await apiFetch<AssignmentDetail>(detailPath(row)));
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.detail : "Unable to load this assignment.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (openedFromQuery.current || loading) return;
    const directRaw = searchParams.get("direct");
    if (directRaw) {
      const directId = Number(directRaw);
      const match = rows.find((row) => row.kind === "direct" && row.direct_assignment_id === directId);
      if (!match) return;
      openedFromQuery.current = true;
      void openDetail(match);
      return;
    }
    const raw = searchParams.get("block");
    if (!raw) return;
    const blockId = Number(raw);
    const match = rows.find((row) => (row.kind ?? "chapter") === "chapter" && row.block_id === blockId);
    if (!match) return;
    openedFromQuery.current = true;
    void openDetail(match);
  }, [loading, openDetail, rows, searchParams]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => row.bucket === filter)),
    [filter, rows],
  );

  useEffect(() => {
    if (selectedKey != null && !visible.some((row) => rowKey(row) === selectedKey)) {
      setSelectedKey(null);
      setDetail(null);
    }
  }, [selectedKey, visible]);

  const empty = emptyCopy(filter);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learning"
        title="My Assignments"
        description="Download each assignment, submit your coursework, and review the confirmation, status, grade, and history."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-none px-4 py-2 text-sm font-semibold ${
              filter === item.id
                ? "bg-caisbe-red text-white"
                : "border border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-caisbe-red/40 bg-caisbe-red/10 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-none border border-ifma-border bg-admin-surface shadow-hopewell">
        {loading ? (
          <p className="px-5 py-8 text-sm text-caisbe-muted">Loading assignments…</p>
        ) : visible.length === 0 ? (
          <div className="px-5 py-10">
            <p className="font-display text-lg font-semibold text-caisbe-text-dark">{empty.title}</p>
            <p className="mt-2 text-sm text-caisbe-muted">{empty.body}</p>
          </div>
        ) : (
          <>
          <ul className="divide-y divide-ifma-border-light md:hidden">
            {visible.map((row) => {
              const selected = rowKey(row) === selectedKey;
              return (
                <li key={rowKey(row)}>
                  <button
                    type="button"
                    onClick={() => void openDetail(row)}
                    className={`block w-full px-5 py-4 text-left ${selected ? "bg-caisbe-red/5" : ""}`}
                  >
                    <p className="break-words font-semibold text-caisbe-text">{row.title}</p>
                    <p className="text-xs text-caisbe-muted">{row.chapter_title}</p>
                    <p className="mt-2 text-sm text-caisbe-text">
                      <span className="font-semibold">{row.course_code}</span>
                      <span className="mt-0.5 block text-caisbe-muted">{row.course_title}</span>
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Due</dt>
                        <dd className="text-caisbe-text">
                          {row.due_at ? formatWhen(row.due_at) : "No due date"}
                          {isOverdue(row) ? (
                            <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                              Overdue
                            </span>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Status</dt>
                        <dd className="font-semibold text-caisbe-text">
                          {statusLabel(row.bucket)}
                          {!row.unlocked && row.bucket === "pending" ? (
                            <span className="mt-0.5 block text-xs font-normal text-caisbe-muted">Finish the chapter topics first.</span>
                          ) : null}
                          {row.review_status === "passed" || row.review_status === "failed" ? (
                            <span className="mt-0.5 block text-xs font-normal uppercase tracking-wide text-caisbe-muted">
                              {row.review_status}
                            </span>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Score</dt>
                        <dd className="font-semibold text-caisbe-text">{scoreText(row)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Submitted</dt>
                        <dd className="text-caisbe-text">
                          {formatWhen(row.submitted_at)}
                          {row.is_late ? <span className="mt-0.5 block text-xs font-semibold text-caisbe-red">Late</span> : null}
                        </dd>
                      </div>
                    </dl>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ifma-border-light bg-admin-surface-muted/40">
                  {["Assignment", "Course", "Due", "Status", "Score", "Date submitted"].map((label) => (
                    <th
                      key={label}
                      className="px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const selected = rowKey(row) === selectedKey;
                  return (
                    <tr
                      key={rowKey(row)}
                      className={`border-b border-ifma-border-light last:border-b-0 ${
                        selected ? "bg-caisbe-red/5" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => void openDetail(row)}
                          className="text-left font-semibold text-caisbe-text hover:text-caisbe-red"
                        >
                          {row.title}
                        </button>
                        <p className="text-xs text-caisbe-muted">{row.chapter_title}</p>
                      </td>
                      <td className="px-5 py-4 text-caisbe-text">
                        <span className="font-semibold">{row.course_code}</span>
                        <span className="mt-0.5 block text-caisbe-muted">{row.course_title}</span>
                      </td>
                      <td className="px-5 py-4 text-caisbe-text">
                        {row.due_at ? formatWhen(row.due_at) : "No due date"}
                        {isOverdue(row) ? (
                          <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                            Overdue
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-caisbe-text">{statusLabel(row.bucket)}</span>
                        {!row.unlocked && row.bucket === "pending" ? (
                          <span className="mt-0.5 block text-xs text-caisbe-muted">Finish the chapter topics first.</span>
                        ) : null}
                        {row.review_status === "passed" || row.review_status === "failed" ? (
                          <span className="mt-0.5 block text-xs uppercase tracking-wide text-caisbe-muted">
                            {row.review_status}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 font-semibold text-caisbe-text">{scoreText(row)}</td>
                      <td className="px-5 py-4 text-caisbe-text">
                        {formatWhen(row.submitted_at)}
                        {row.is_late ? <span className="mt-0.5 block text-xs font-semibold text-caisbe-red">Late</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      {selectedKey != null ? (
        <AssignmentDetailPanel
          loading={detailLoading}
          error={detailError}
          detail={detail}
          onChanged={async () => {
            await load();
            const match = rows.find((row) => rowKey(row) === selectedKey);
            if (match) await openDetail(match);
          }}
        />
      ) : null}
    </div>
  );
}

function AssignmentDetailPanel({
  detail,
  loading,
  error,
  onChanged,
}: {
  detail: AssignmentDetail | null;
  loading: boolean;
  error: string | null;
  onChanged: () => Promise<void>;
}) {
  if (loading) {
    return <p className="text-sm text-caisbe-muted">Loading assignment…</p>;
  }
  if (error) {
    return (
      <p className="rounded-md border border-caisbe-red/40 bg-caisbe-red/10 px-4 py-3 text-sm text-caisbe-red">{error}</p>
    );
  }
  if (!detail) return null;

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
  const courseHref =
    detail.kind === "direct" && detail.direct_assignment_id
      ? `/courses/${detail.course_id}?direct=${detail.direct_assignment_id}`
      : `/courses/${detail.course_id}?block=${detail.block_id}`;
  const overdue = isOverdue({ bucket: detail.bucket as AssignmentRow["bucket"], due_at: detail.due_at });

  return (
    <section className="space-y-6 rounded-none border border-ifma-border bg-admin-surface p-5 shadow-hopewell md:p-6">
      <AssignmentWorkTabs
        detail={detail}
        defaultTab="download"
        onChanged={onChanged}
        header={
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                  {detail.course_code} · {detail.chapter_title}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">{detail.title}</h2>
              </div>
              <Link href={courseHref} className="text-sm font-semibold text-caisbe-red hover:underline">
                Open in course
              </Link>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-ifma-border-light px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Due date</dt>
                <dd className="mt-1 text-sm font-semibold text-caisbe-text">
                  {detail.due_at ? formatWhen(detail.due_at) : "No due date"}
                  {detail.points_possible != null ? (
                    <span className="mt-0.5 block font-normal text-caisbe-muted">{detail.points_possible} points</span>
                  ) : null}
                  {overdue ? (
                    <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wide text-caisbe-red">Overdue</span>
                  ) : null}
                </dd>
              </div>
              <div className="rounded-md border border-ifma-border-light px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment status</dt>
                <dd className="mt-1 text-sm font-semibold text-caisbe-text">
                  {statusLabel(detail.bucket)}
                  {detail.review_status === "passed" || detail.review_status === "failed" ? (
                    <span className="mt-0.5 block text-xs uppercase tracking-wide text-caisbe-muted">{detail.review_status}</span>
                  ) : null}
                  {detail.is_late ? (
                    <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wide text-caisbe-red">Late</span>
                  ) : null}
                  {!detail.unlocked && detail.bucket === "pending" ? (
                    <span className="mt-0.5 block text-xs font-normal text-caisbe-muted">Finish the chapter topics first.</span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </div>
        }
        statusPanel={
          <>
            {detail.bucket === "submitted" ? (
              <div className="rounded-md border border-admin-warning/40 bg-admin-warning-soft px-4 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Submission confirmation</h3>
                <p className="mt-2 font-semibold text-caisbe-text-dark">Submitted — under review</p>
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
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Grades &amp; feedback</h3>
                {score ? <p className="mt-2 text-lg font-semibold text-caisbe-text-dark">{score}</p> : null}
                {detail.feedback ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-caisbe-text">{detail.feedback}</p>
                ) : (
                  <p className="mt-2 text-sm text-caisbe-muted">No written feedback was added.</p>
                )}
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
        supportPanel={
          <div className="border-t border-ifma-border-light pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Technical support</h3>
            <p className="mt-2 text-sm text-caisbe-muted">
              If a file will not upload or a due date looks wrong, open a ticket and CAISBE will follow up.
            </p>
            <Link href="/messages" className="mt-2 inline-flex text-sm font-semibold text-caisbe-red hover:underline">
              Open a ticket
            </Link>
          </div>
        }
      />
    </section>
  );
}
