"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, apiUpload, ApiError } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

type Bucket = "all" | "pending" | "submitted" | "evaluated";

type AssignmentRow = {
  block_id: number;
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
  block_id: number;
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
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

  const openDetail = useCallback(async (blockId: number) => {
    setSelectedId(blockId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetail(await apiFetch<AssignmentDetail>(`/me/assignments/${blockId}`));
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
    const raw = searchParams.get("block");
    if (!raw) return;
    const blockId = Number(raw);
    if (!rows.some((row) => row.block_id === blockId)) return;
    openedFromQuery.current = true;
    void openDetail(blockId);
  }, [loading, openDetail, rows, searchParams]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => row.bucket === filter)),
    [filter, rows],
  );

  useEffect(() => {
    if (selectedId != null && !visible.some((row) => row.block_id === selectedId)) {
      setSelectedId(null);
      setDetail(null);
    }
  }, [selectedId, visible]);

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
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
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

      <section className="overflow-hidden rounded-[20px] border border-ifma-border bg-admin-surface shadow-hopewell">
        {loading ? (
          <p className="px-5 py-8 text-sm text-caisbe-muted">Loading assignments…</p>
        ) : visible.length === 0 ? (
          <div className="px-5 py-10">
            <p className="font-display text-lg font-semibold text-caisbe-text-dark">{empty.title}</p>
            <p className="mt-2 text-sm text-caisbe-muted">{empty.body}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  const selected = row.block_id === selectedId;
                  return (
                    <tr
                      key={row.block_id}
                      className={`border-b border-ifma-border-light last:border-b-0 ${
                        selected ? "bg-caisbe-red/5" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => void openDetail(row.block_id)}
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
        )}
      </section>

      {selectedId != null ? (
        <AssignmentDetailPanel
          loading={detailLoading}
          error={detailError}
          detail={detail}
          onChanged={async () => {
            await load();
            await openDetail(selectedId);
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
  const courseHref = `/courses/${detail.course_id}?block=${detail.block_id}`;
  const overdue = isOverdue({ bucket: detail.bucket as AssignmentRow["bucket"], due_at: detail.due_at });
  const instructionsHref = fileHref(detail.instructions_url);

  return (
    <section className="space-y-6 rounded-[20px] border border-ifma-border bg-admin-surface p-5 shadow-hopewell md:p-6">
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

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
          {detail.instructions_url ? "Download assignment" : "Assignment"}
        </h3>
        {instructionsHref ? (
          <a
            href={instructionsHref}
            download
            className="mt-2 inline-flex font-semibold text-caisbe-red hover:underline"
          >
            {detail.instructions_label || "Download assignment"}
          </a>
        ) : detail.instructions_body ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-caisbe-text">{detail.instructions_body}</p>
        ) : (
          <p className="mt-2 text-sm text-caisbe-muted">No material is attached.</p>
        )}
      </div>

      {!detail.unlocked && detail.bucket === "pending" ? (
        <p className="rounded-md border border-dashed border-ifma-border px-4 py-4 text-sm text-caisbe-muted">
          Complete this chapter&apos;s topics before you can submit this assignment.
        </p>
      ) : null}
      {detail.unlocked && detail.bucket === "pending" && !detail.can_submit ? (
        <p className="rounded-md border border-dashed border-ifma-border px-4 py-4 text-sm text-caisbe-muted">
          The due date has passed. This assignment is closed.
        </p>
      ) : null}

      {detail.can_submit || detail.can_resubmit || detail.can_withdraw ? (
        <ResponseForm detail={detail} onChanged={onChanged} />
      ) : null}

      {detail.bucket === "submitted" ? (
        <div className="rounded-md border border-admin-warning/40 bg-admin-warning-soft px-4 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Submission confirmation</h3>
          <p className="mt-2 font-semibold text-caisbe-text-dark">Submitted — under review</p>
          <p className="mt-1 text-sm text-caisbe-text">{detail.title}</p>
          <p className="text-sm text-caisbe-muted">
            {detail.course_code} · {detail.course_title}
          </p>
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

      <div className="border-t border-ifma-border-light pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Technical support</h3>
        <p className="mt-2 text-sm text-caisbe-muted">
          If a file will not upload or a due date looks wrong, open a ticket and CAISBE will follow up.
        </p>
        <Link href="/messages" className="mt-2 inline-flex text-sm font-semibold text-caisbe-red hover:underline">
          Open a ticket
        </Link>
      </div>
    </section>
  );
}

function ResponseForm({
  detail,
  onChanged,
}: {
  detail: AssignmentDetail;
  onChanged: () => Promise<void>;
}) {
  const [source, setSource] = useState<"file" | "written">("file");
  const [file, setFile] = useState<File | null>(null);
  const [written, setWritten] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let url: string | null = null;
      let name: string | null = null;
      let body: string | null = null;
      if (source === "file") {
        if (!file) {
          setError("Choose a PDF, Word, or image file.");
          return;
        }
        const uploaded = await apiUpload("/me/uploads", file, { maxBytes: 25 * 1024 * 1024 });
        url = uploaded.url;
        name = uploaded.filename;
      } else {
        body = written.trim();
        if (!body) {
          setError("Write your answer.");
          return;
        }
      }
      await apiFetch(`/me/blocks/${detail.block_id}/submit`, {
        method: "POST",
        body: JSON.stringify({ body, url, file_name: name }),
      });
      setWritten("");
      setFile(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to submit assignment.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/me/blocks/${detail.block_id}/submit`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to withdraw this submission.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-ifma-border-light pt-6">
      {detail.can_submit || detail.can_resubmit ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            {detail.can_submit ? "Submit coursework" : "Resubmit"}
          </h3>
          <div className="flex w-full max-w-md rounded-md border border-ifma-border bg-admin-surface p-1">
            <button
              type="button"
              onClick={() => {
                setSource("file");
                setWritten("");
              }}
              className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                source === "file" ? "bg-caisbe-red text-white" : "text-caisbe-text"
              }`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => {
                setSource("written");
                setFile(null);
              }}
              className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                source === "written" ? "bg-caisbe-red text-white" : "text-caisbe-text"
              }`}
            >
              Written answer
            </button>
          </div>
          {source === "file" ? (
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-caisbe-muted"
            />
          ) : (
            <textarea
              required
              value={written}
              onChange={(event) => setWritten(event.target.value)}
              rows={5}
              placeholder="Write your answer here"
              className="w-full rounded-md border border-ifma-border px-3 py-2 text-sm text-caisbe-text outline-none focus:border-caisbe-red"
            />
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 py-2.5 text-sm font-semibold uppercase text-white disabled:opacity-60"
          >
            {busy ? "Submitting…" : detail.can_submit ? "Submit for review" : "Resubmit"}
          </button>
        </form>
      ) : null}
      {detail.can_withdraw ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void withdraw()}
          className="rounded-md border-2 border-ifma-border bg-admin-surface px-5 py-2.5 text-sm font-semibold uppercase text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-60"
        >
          {busy ? "Withdrawing…" : "Unsubmit"}
        </button>
      ) : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
    </div>
  );
}
