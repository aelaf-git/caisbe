"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";
import {
  SUPPORT_KIND_LABELS,
  SUPPORT_STATUS_LABELS,
  formatMessageTime,
  type SupportKind,
  type SupportMessage,
  type SupportThread,
} from "@/lib/support";

const POLL_MS = 3000;

function ticketNumber(id: number) {
  return `TKT-${String(id).padStart(5, "0")}`;
}

function formatSubmittedDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MessagesPageInner() {
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState<SupportKind>("issue");
  const [newBody, setNewBody] = useState("");
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const composeOpened = useRef(false);

  const selected = useMemo(
    () => threads.find((row) => row.id === selectedId) ?? null,
    [threads, selectedId],
  );

  const loadThreads = useCallback(async () => {
    try {
      const rows = await apiFetch<SupportThread[]>("/me/support/threads");
      setThreads(rows);
      setError(null);
      return rows;
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load tickets.");
      return [];
    }
  }, []);

  const openThread = useCallback(async (threadId: number) => {
    setSelectedId(threadId);
    setComposing(false);
    setError(null);
    try {
      const detail = await apiFetch<SupportThread>(`/me/support/threads/${threadId}`);
      const list = detail.messages ?? [];
      setMessages(list);
      lastIdRef.current = list.reduce((max, row) => Math.max(max, row.id), 0);
      await apiFetch(`/me/support/threads/${threadId}/read`, { method: "POST" });
      setThreads((current) =>
        current.map((row) => (row.id === threadId ? { ...row, unread_count: 0 } : row)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to open ticket.");
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (composeOpened.current) return;
    const threadParam = Number(searchParams.get("thread"));
    if (Number.isInteger(threadParam) && threadParam > 0) {
      composeOpened.current = true;
      void openThread(threadParam);
      return;
    }
    if (searchParams.get("compose") === "1") {
      composeOpened.current = true;
      setComposing(true);
      setSelectedId(null);
      setMessages([]);
    }
  }, [searchParams, openThread]);

  useEffect(() => {
    if (selectedId == null) return;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const newer = await apiFetch<SupportMessage[]>(
            `/me/support/threads/${selectedId}/messages?after_id=${lastIdRef.current}`,
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
          if (newer.some((row) => row.is_from_admin)) {
            await apiFetch(`/me/support/threads/${selectedId}/read`, { method: "POST" });
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

  async function createThread(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch<SupportThread>("/me/support/threads", {
        method: "POST",
        body: JSON.stringify({ subject, kind, body: newBody }),
      });
      setSubject("");
      setNewBody("");
      setKind("issue");
      setComposing(false);
      await loadThreads();
      await openThread(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to create ticket.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy || !reply.trim()) return;
    if (selected.status === "closed") {
      setError("This ticket is closed.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const msg = await apiFetch<SupportMessage>(`/me/support/threads/${selected.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      setReply("");
      setMessages((current) => [...current, msg]);
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      void loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Support"
        title="Tickets"
        description="Log in to track the status of your existing support tickets."
        actions={
          <button
            type="button"
            onClick={() => {
              setComposing(true);
              setSelectedId(null);
              setMessages([]);
            }}
            className="inline-flex h-11 items-center rounded-full bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
          >
            Submit Your Ticket
          </button>
        }
      />

      <section className="overflow-hidden rounded-[20px] border border-ifma-border bg-admin-surface shadow-hopewell">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ifma-border-light bg-admin-surface-muted/40">
                <th className="px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark">
                  Ticket
                </th>
                <th className="px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark">
                  Issue
                </th>
                <th className="px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark">
                  Date submitted
                </th>
                <th className="px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark">
                  Number
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {threads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-caisbe-muted">
                    No tickets yet. Submit a support ticket below to report an issue or resolve a
                    question.
                  </td>
                </tr>
              ) : (
                threads.map((thread) => {
                  const active = thread.id === selectedId && !composing;
                  return (
                    <tr
                      key={thread.id}
                      className={`cursor-pointer transition-colors hover:bg-admin-surface-muted/50 ${
                        active ? "bg-caisbe-red/[0.06]" : ""
                      }`}
                      onClick={() => void openThread(thread.id)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-caisbe-text-dark">{thread.subject}</p>
                        <p className="mt-0.5 text-xs text-caisbe-muted">
                          {SUPPORT_STATUS_LABELS[thread.status]}
                          {thread.unread_count > 0 ? ` · ${thread.unread_count} new` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-caisbe-text">{SUPPORT_KIND_LABELS[thread.kind]}</td>
                      <td className="px-5 py-4 text-caisbe-muted">
                        {formatSubmittedDate(thread.created_at)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-caisbe-text-dark">
                        {ticketNumber(thread.id)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {composing ? (
        <section className="rounded-[20px] border border-ifma-border bg-admin-surface p-6 shadow-hopewell">
          <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">
            Submit Your Ticket
          </h2>
          <p className="mt-2 text-sm leading-6 text-caisbe-muted">
            Submit a support ticket to report an issue or resolve a question.
          </p>
          <form onSubmit={(e) => void createThread(e)} className="mt-6 flex flex-col gap-4">
            <label className="block text-sm font-semibold text-caisbe-text">
              Issue type
              <select
                className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value as SupportKind)}
              >
                <option value="issue">Issue / problem</option>
                <option value="question">Question</option>
                <option value="general">General</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-caisbe-text">
              Ticket subject
              <input
                required
                minLength={2}
                maxLength={255}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                placeholder="Short summary"
              />
            </label>
            <label className="block text-sm font-semibold text-caisbe-text">
              Details
              <textarea
                required
                minLength={1}
                rows={8}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                placeholder="Describe your question or issue…"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 py-2 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Submit ticket"}
              </button>
              <button
                type="button"
                onClick={() => setComposing(false)}
                className="rounded-md border border-ifma-border px-5 py-2 text-sm font-semibold text-caisbe-text"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {selected && !composing ? (
        <section className="flex min-h-[360px] flex-col rounded-[20px] border border-ifma-border bg-admin-surface shadow-hopewell">
          <header className="border-b border-ifma-border px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              {ticketNumber(selected.id)} · {SUPPORT_KIND_LABELS[selected.kind]} ·{" "}
              {SUPPORT_STATUS_LABELS[selected.status]}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-caisbe-text-dark">
              {selected.subject}
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Submitted {formatSubmittedDate(selected.created_at)}
            </p>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                  msg.is_from_admin
                    ? "bg-admin-canvas text-caisbe-text"
                    : "ml-auto bg-caisbe-red/10 text-caisbe-text-dark"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-caisbe-muted">
                  {msg.is_from_admin ? "Admin" : "You"} · {formatMessageTime(msg.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap leading-6">{msg.body}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {selected.status === "closed" ? (
            <p className="border-t border-ifma-border px-5 py-3 text-sm text-caisbe-muted">
              This ticket is closed.
            </p>
          ) : (
            <form
              onSubmit={(e) => void sendReply(e)}
              className="flex gap-2 border-t border-ifma-border p-4"
            >
              <textarea
                required
                rows={2}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
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
        </section>
      ) : null}

      {!composing && !selected ? (
        <section className="rounded-[20px] border border-ifma-border bg-admin-surface p-6 shadow-hopewell">
          <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">
            Submit Your Ticket
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-caisbe-muted">
            Submit a support ticket to report an issue or resolve a question.
          </p>
          <button
            type="button"
            onClick={() => {
              setComposing(true);
              setSelectedId(null);
              setMessages([]);
            }}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
          >
            Submit Your Ticket
          </button>
        </section>
      ) : null}

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            eyebrow="Support"
            title="Tickets"
            description="Log in to track the status of your existing support tickets."
          />
          <p className="text-sm text-caisbe-muted">Loading tickets…</p>
        </div>
      }
    >
      <MessagesPageInner />
    </Suspense>
  );
}
