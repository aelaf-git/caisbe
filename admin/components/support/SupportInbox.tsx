"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import {
  SUPPORT_KIND_LABELS,
  SUPPORT_STATUS_LABELS,
  formatMessageTime,
  type SupportMessage,
  type SupportStatus,
  type SupportThread,
} from "@/lib/support";

const POLL_MS = 3000;

export default function SupportInbox() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  const selected = useMemo(
    () => threads.find((row) => row.id === selectedId) ?? null,
    [threads, selectedId],
  );

  const loadThreads = useCallback(async () => {
    try {
      const qs = statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const rows = await apiFetch<SupportThread[]>(`/admin/support/threads${qs}`);
      setThreads(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load support inbox.");
    }
  }, [statusFilter]);

  const openThread = useCallback(async (threadId: number) => {
    setSelectedId(threadId);
    setError(null);
    try {
      const detail = await apiFetch<SupportThread>(`/admin/support/threads/${threadId}`);
      const list = detail.messages ?? [];
      setMessages(list);
      lastIdRef.current = list.reduce((max, row) => Math.max(max, row.id), 0);
      await apiFetch(`/admin/support/threads/${threadId}/read`, { method: "POST" });
      setThreads((current) =>
        current.map((row) => (row.id === threadId ? { ...row, unread_count: 0 } : row)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to open conversation.");
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedId == null) return;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const newer = await apiFetch<SupportMessage[]>(
            `/admin/support/threads/${selectedId}/messages?after_id=${lastIdRef.current}`,
          );
          if (newer.length === 0) return;
          setMessages((current) => {
            const seen = new Set(current.map((row) => row.id));
            const merged = [...current];
            for (const row of newer) {
              if (!seen.has(row.id)) merged.push(row);
            }
            return merged;
          });
          lastIdRef.current = Math.max(lastIdRef.current, ...newer.map((row) => row.id));
          if (newer.some((row) => !row.is_from_admin)) {
            await apiFetch(`/admin/support/threads/${selectedId}/read`, { method: "POST" });
          }
          void loadThreads();
        } catch {
          // keep polling
        }
      })();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedId, loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const msg = await apiFetch<SupportMessage>(`/admin/support/threads/${selected.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      setReply("");
      setMessages((current) => [...current, msg]);
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      void loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to send reply.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(next: SupportStatus) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const updated = await apiFetch<SupportThread>(`/admin/support/threads/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setThreads((current) =>
        current.map((row) => (row.id === updated.id ? { ...row, status: updated.status } : row)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "waiting_admin", "waiting_student", "closed"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              statusFilter === key
                ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-red"
                : "border-ifma-border text-caisbe-muted hover:border-caisbe-red/40"
            }`}
          >
            {key === "all" ? "All" : SUPPORT_STATUS_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="max-h-[70vh] space-y-1 overflow-y-auto rounded-md border border-ifma-border bg-admin-surface p-2">
          {threads.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-caisbe-muted">No conversations.</p>
          ) : (
            threads.map((thread) => {
              const active = thread.id === selectedId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => void openThread(thread.id)}
                  className={`w-full rounded-md px-3 py-2.5 text-left ${
                    active ? "bg-caisbe-red/10" : "hover:bg-admin-canvas"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-caisbe-text-dark">
                      {thread.subject}
                    </p>
                    {thread.unread_count > 0 ? (
                      <span className="rounded-full bg-caisbe-red px-1.5 text-[10px] font-bold text-white">
                        {thread.unread_count}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-caisbe-muted">
                    {thread.student_name} · {SUPPORT_KIND_LABELS[thread.kind]}
                  </p>
                  <p className="text-xs text-caisbe-muted">{SUPPORT_STATUS_LABELS[thread.status]}</p>
                </button>
              );
            })
          )}
        </aside>

        <section className="flex min-h-[480px] flex-col rounded-md border border-ifma-border bg-admin-surface">
          {selected ? (
            <>
              <header className="space-y-2 border-b border-ifma-border px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">
                      {selected.subject}
                    </h2>
                    <p className="mt-1 text-sm text-caisbe-muted">
                      {selected.student_name} · {selected.student_email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setStatus("closed")}
                      className="rounded-md border border-ifma-border px-3 py-1.5 text-xs font-semibold uppercase text-caisbe-text"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setStatus("open")}
                      className="rounded-md border border-ifma-border px-3 py-1.5 text-xs font-semibold uppercase text-caisbe-text"
                    >
                      Reopen
                    </button>
                  </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                  {SUPPORT_KIND_LABELS[selected.kind]} · {SUPPORT_STATUS_LABELS[selected.status]}
                </p>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                      msg.is_from_admin
                        ? "ml-auto bg-caisbe-red/10 text-caisbe-text-dark"
                        : "bg-admin-canvas text-caisbe-text"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-caisbe-muted">
                      {msg.is_from_admin ? "Admin" : msg.sender_name || "Student"} ·{" "}
                      {formatMessageTime(msg.created_at)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-6">{msg.body}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {selected.status === "closed" ? (
                <p className="border-t border-ifma-border px-5 py-3 text-sm text-caisbe-muted">
                  Conversation closed. Reopen to reply.
                </p>
              ) : (
                <form onSubmit={(e) => void sendReply(e)} className="flex gap-2 border-t border-ifma-border p-4">
                  <textarea
                    required
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Reply to student…"
                    className="min-h-[44px] flex-1 rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy || !reply.trim()}
                    className="self-end rounded-md border-2 border-caisbe-red bg-caisbe-red px-4 py-2 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
                  >
                    Send
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-caisbe-muted">
              Select a conversation from the inbox.
            </div>
          )}
        </section>
      </div>
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
    </div>
  );
}
