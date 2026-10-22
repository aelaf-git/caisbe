"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

export type AssignmentWorkDetail = {
  kind?: "chapter" | "direct";
  block_id: number;
  direct_assignment_id?: number | null;
  title: string;
  instructions_body: string | null;
  instructions_url: string | null;
  instructions_label: string | null;
  can_submit: boolean;
  can_resubmit: boolean;
  can_withdraw: boolean;
  unlocked: boolean;
  bucket: string;
  due_at: string | null;
  review_status: string | null;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
};

type TabId = "download" | "upload";

function fileHref(url: string | null) {
  return resolveUploadUrl(url) ?? url;
}

function submitPath(detail: AssignmentWorkDetail) {
  if (detail.kind === "direct" && detail.direct_assignment_id) {
    return `/me/direct-assignments/${detail.direct_assignment_id}/submit`;
  }
  return `/me/blocks/${detail.block_id}/submit`;
}

export default function AssignmentWorkTabs({
  detail,
  onChanged,
  header,
  statusPanel,
  historyPanel,
  supportPanel,
  defaultTab = "download",
}: {
  detail: AssignmentWorkDetail;
  onChanged: () => Promise<void>;
  header?: ReactNode;
  statusPanel?: ReactNode;
  historyPanel?: ReactNode;
  supportPanel?: ReactNode;
  defaultTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(defaultTab);
  const [source, setSource] = useState<"file" | "written">("file");
  const [file, setFile] = useState<File | null>(null);
  const [written, setWritten] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const instructionsHref = fileHref(detail.instructions_url);
  const canRespond = detail.can_submit || detail.can_resubmit || detail.can_withdraw;

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
      await apiFetch(submitPath(detail), {
        method: "POST",
        body: JSON.stringify({ body, url, file_name: name }),
      });
      setWritten("");
      setFile(null);
      await onChanged();
      setTab("upload");
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
      await apiFetch(submitPath(detail), { method: "DELETE" });
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to withdraw this submission.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="flex w-full max-w-md rounded-md border border-ifma-border bg-admin-surface p-1">
        {(
          [
            ["download", "Download"],
            ["upload", "Upload answers"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
              tab === id ? "bg-caisbe-red text-white" : "text-caisbe-text hover:bg-ifma-border-light"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "download" ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            {detail.instructions_url ? "Download assignment" : "Assignment"}
          </h3>
          {instructionsHref ? (
            <a
              href={instructionsHref}
              download
              className="flex items-center gap-3 rounded-md border border-ifma-border bg-admin-surface px-4 py-3 text-caisbe-text transition-colors hover:border-caisbe-red hover:text-caisbe-red"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                  Download document
                </span>
                <span className="mt-0.5 block truncate font-semibold">
                  {detail.instructions_label || detail.title || "Download assignment"}
                </span>
              </span>
            </a>
          ) : null}
          {detail.instructions_body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-caisbe-text">{detail.instructions_body}</p>
          ) : null}
          {!instructionsHref && !detail.instructions_body ? (
            <p className="rounded-md border border-dashed border-ifma-border px-4 py-6 text-sm text-caisbe-muted">
              No material is attached.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="space-y-4">
          {statusPanel}

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

          {detail.can_submit || detail.can_resubmit ? (
            <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-md border border-ifma-border bg-[#fafaf8] p-4 md:p-5">
              <p className="text-sm text-caisbe-muted">
                Complete the exercise, then submit a document, photo, or written answer.
              </p>
              <div className="flex w-full max-w-md rounded-md border border-ifma-border bg-admin-surface p-1">
                <button
                  type="button"
                  onClick={() => {
                    setSource("file");
                    setWritten("");
                  }}
                  className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                    source === "file" ? "bg-caisbe-red text-white" : "text-caisbe-text hover:bg-ifma-border-light"
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
                    source === "written" ? "bg-caisbe-red text-white" : "text-caisbe-text hover:bg-ifma-border-light"
                  }`}
                >
                  Written answer
                </button>
              </div>
              {source === "file" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-caisbe-text">PDF, Word, or photo</span>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-md border border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-muted file:mr-3 file:rounded-md file:border-0 file:bg-caisbe-red/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-caisbe-red"
                  />
                  {file ? <p className="text-xs text-caisbe-muted">Selected: {file.name}</p> : null}
                </label>
              ) : (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-caisbe-text">Written answer</span>
                  <textarea
                    required
                    value={written}
                    onChange={(event) => setWritten(event.target.value)}
                    rows={6}
                    placeholder="Write your answer here"
                    className="w-full rounded-md border border-ifma-border bg-admin-surface px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red"
                  />
                </label>
              )}
              <button
                type="submit"
                disabled={busy}
                className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
              >
                {busy ? "Submitting…" : detail.can_resubmit ? "Resubmit" : "Submit for review"}
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

          {!canRespond && detail.bucket === "pending" && detail.unlocked === false ? null : null}
          {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
        </section>
      )}

      {historyPanel}
      {supportPanel}
    </div>
  );
}
