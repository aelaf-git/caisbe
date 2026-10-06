"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function MessagesPage() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState<SupportKind>("question");
  const [newBody, setNewBody] = useState("");
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

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
      setError(err instanceof ApiError ? err.detail : "Unable to load messages.");
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
      setKind("question");
      setComposing(false);
      await loadThreads();
      await openThread(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to start conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy || !reply.trim()) return;
    if (selected.status === "closed") {
      setError("This conversation is closed.");
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Messages"
        description="Ask questions or file issues with CAISBE admin. Conversations update in near real time."
      />

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-md border border-ifma-border bg-admin-surface p-3">
          <button
            type="button"
            onClick={() => {
              setComposing(true);
              setSelectedId(null);
              setMessages([]);
            }}
            className="w-full rounded-md border-2 border-caisbe-red bg-caisbe-red px-3 py-2 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark"
          >
            New message
          </button>
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {threads.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-caisbe-muted">No conversations yet.</li>
            ) : (
              threads.map((thread) => {
                const active = thread.id === selectedId && !composing;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => void openThread(thread.id)}
                      className={`w-full rounded-md px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-caisbe-red/10 text-caisbe-text-dark"
                          : "hover:bg-admin-canvas text-caisbe-text"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold">{thread.subject}</p>
                        {thread.unread_count > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-caisbe-red px-1.5 text-[10px] font-bold text-white">
                            {thread.unread_count}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-caisbe-muted">
                        {SUPPORT_KIND_LABELS[thread.kind]} · {SUPPORT_STATUS_LABELS[thread.status]}
                      </p>
                      {thread.last_preview ? (
                        <p className="mt-1 line-clamp-2 text-xs text-caisbe-muted">{thread.last_preview}</p>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className="flex min-h-[420px] flex-col rounded-md border border-ifma-border bg-admin-surface">
          {composing ? (
            <form onSubmit={(e) => void createThread(e)} className="flex flex-1 flex-col gap-4 p-5">
              <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Start a conversation</h2>
              <label className="block text-sm font-semibold text-caisbe-text">
                Type
                <select
                  className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as SupportKind)}
                >
                  <option value="question">Question</option>
                  <option value="issue">Issue / problem</option>
                  <option value="general">General</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-caisbe-text">
                Subject
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
              <label className="block flex-1 text-sm font-semibold text-caisbe-text">
                Message
                <textarea
                  required
                  minLength={1}
                  rows={8}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="mt-1 w-full flex-1 rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                  placeholder="Describe your question or issue…"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 py-2 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send"}
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
          ) : selected ? (
            <>
              <header className="border-b border-ifma-border px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                  {SUPPORT_KIND_LABELS[selected.kind]} · {SUPPORT_STATUS_LABELS[selected.status]}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-caisbe-text-dark">
                  {selected.subject}
                </h2>
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
                  This conversation is closed.
                </p>
              ) : (
                <form onSubmit={(e) => void sendReply(e)} className="flex gap-2 border-t border-ifma-border p-4">
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
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-5 text-sm text-caisbe-muted">
              Select a conversation or start a new message.
            </div>
          )}
        </section>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
    </div>
  );
}
