"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/lib/auth";
import {
  formatForumTime,
  type ForumAdminThreadDetail,
  type ForumAdminThreadSummary,
  type ForumCategory,
} from "@/lib/forum";

export default function ForumModeration() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [boardSlug, setBoardSlug] = useState("all");
  const [threads, setThreads] = useState<ForumAdminThreadSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ForumAdminThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draftBoard, setDraftBoard] = useState("announcements");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [reply, setReply] = useState("");

  const boards = useMemo(
    () => categories.flatMap((category) => category.boards),
    [categories],
  );

  const loadThreads = useCallback(async () => {
    const qs = boardSlug === "all" ? "" : `?board_slug=${encodeURIComponent(boardSlug)}`;
    const rows = await apiFetch<ForumAdminThreadSummary[]>(`/admin/forum/threads${qs}`);
    setThreads(rows);
  }, [boardSlug]);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const rows = await apiFetch<ForumCategory[]>("/admin/forum/categories");
        if (!cancelled) setCategories(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Unable to load forum boards.");
        }
      }
    }
    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await loadThreads();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Unable to load discussions.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadThreads]);

  async function openThread(threadId: number) {
    setSelectedId(threadId);
    setComposing(false);
    setError(null);
    try {
      const row = await apiFetch<ForumAdminThreadDetail>(`/admin/forum/threads/${threadId}`);
      setDetail(row);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to open this discussion.");
    }
  }

  async function moderate(patch: { pinned?: boolean; locked?: boolean; hidden?: boolean }) {
    if (!detail || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiFetch<ForumAdminThreadDetail>(`/admin/forum/threads/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setDetail(updated);
      await loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update this discussion.");
    } finally {
      setBusy(false);
    }
  }

  async function moderateReply(replyId: number, hidden: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiFetch<ForumAdminThreadDetail>(`/admin/forum/replies/${replyId}`, {
        method: "PATCH",
        body: JSON.stringify({ hidden }),
      });
      setDetail(updated);
      await loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update this reply.");
    } finally {
      setBusy(false);
    }
  }

  async function postDiscussion(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch<ForumAdminThreadDetail>(
        `/admin/forum/boards/${encodeURIComponent(draftBoard)}/threads`,
        {
          method: "POST",
          body: JSON.stringify({ title: draftTitle, body: draftBody }),
        },
      );
      setDraftTitle("");
      setDraftBody("");
      setComposing(false);
      setSelectedId(created.id);
      setDetail(created);
      if (boardSlug !== "all" && boardSlug !== created.board_slug) {
        setBoardSlug(created.board_slug);
      } else {
        await loadThreads();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to post this discussion.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!detail || busy || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiFetch<ForumAdminThreadDetail>(`/admin/forum/threads/${detail.id}/replies`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      setReply("");
      setDetail(updated);
      await loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to post this reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setBoardSlug("all")}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
            boardSlug === "all"
              ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-red"
              : "border-ifma-border text-caisbe-muted hover:border-caisbe-red/40"
          }`}
        >
          All
        </button>
        {boards.map((board) => (
          <button
            key={board.slug}
            type="button"
            onClick={() => setBoardSlug(board.slug)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              boardSlug === board.slug
                ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-red"
                : "border-ifma-border text-caisbe-muted hover:border-caisbe-red/40"
            }`}
          >
            {board.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setComposing(true);
            setSelectedId(null);
            setDetail(null);
            setDraftBoard(boards.some((board) => board.slug === "announcements") ? "announcements" : boards[0]?.slug || "announcements");
          }}
          className="ml-auto rounded-md border-2 border-caisbe-red bg-caisbe-red px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark"
        >
          New discussion
        </button>
      </div>

      {composing ? (
        <form
          onSubmit={(event) => void postDiscussion(event)}
          className="space-y-3 rounded-md border border-ifma-border bg-admin-surface p-5"
        >
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Post a discussion</h2>
          <label className="block text-sm font-semibold text-caisbe-text">
            Board
            <select
              value={draftBoard}
              onChange={(event) => setDraftBoard(event.target.value)}
              className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
            >
              {boards.map((board) => (
                <option key={board.slug} value={board.slug}>
                  {board.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-caisbe-text">
            Title
            <input
              required
              minLength={2}
              maxLength={200}
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-caisbe-text">
            Message
            <textarea
              required
              rows={5}
              maxLength={8000}
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-4 py-2 text-sm font-semibold uppercase text-white disabled:opacity-60"
            >
              {busy ? "Posting…" : "Post"}
            </button>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="rounded-md border border-ifma-border px-4 py-2 text-sm font-semibold text-caisbe-text"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="max-h-[70vh] space-y-1 overflow-y-auto rounded-md border border-ifma-border bg-admin-surface p-2">
          {threads.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-caisbe-muted">No discussions.</p>
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
                  <p className="line-clamp-2 text-sm font-semibold text-caisbe-text-dark">{thread.title}</p>
                  <p className="mt-0.5 text-xs text-caisbe-muted">
                    {thread.board_title} · {thread.author_name}
                  </p>
                  <p className="text-xs text-caisbe-muted">
                    {thread.hidden ? "Hidden" : "Visible"}
                    {thread.locked ? " · Locked" : ""}
                    {thread.pinned ? " · Pinned" : ""}
                  </p>
                </button>
              );
            })
          )}
        </aside>

        <section className="flex min-h-[480px] flex-col rounded-md border border-ifma-border bg-admin-surface">
          {detail ? (
            <>
              <header className="space-y-3 border-b border-ifma-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                    {detail.category_title} · {detail.board_title}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-caisbe-text-dark">{detail.title}</h2>
                  <p className="mt-1 text-sm text-caisbe-muted">
                    {detail.author_name}
                    {detail.author_email ? ` · ${detail.author_email}` : ""} · {formatForumTime(detail.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void moderate({ pinned: !detail.pinned })}
                    className="rounded-md border border-ifma-border px-3 py-1.5 text-xs font-semibold uppercase text-caisbe-text"
                  >
                    {detail.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void moderate({ locked: !detail.locked })}
                    className="rounded-md border border-ifma-border px-3 py-1.5 text-xs font-semibold uppercase text-caisbe-text"
                  >
                    {detail.locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void moderate({ hidden: !detail.hidden })}
                    className="rounded-md border border-ifma-border px-3 py-1.5 text-xs font-semibold uppercase text-caisbe-text"
                  >
                    {detail.hidden ? "Restore" : "Hide"}
                  </button>
                </div>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                <article className="rounded-md bg-admin-canvas px-3 py-2 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-caisbe-muted">
                    {detail.author_name} · Opening post
                  </p>
                  <p className="mt-1 whitespace-pre-wrap leading-6 text-caisbe-text">{detail.body}</p>
                </article>
                {detail.replies.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-md px-3 py-2 text-sm ${item.hidden ? "bg-admin-canvas/60 opacity-70" : "bg-admin-canvas"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-caisbe-muted">
                        {item.author_name} · {formatForumTime(item.created_at)}
                        {item.hidden ? " · Hidden" : ""}
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void moderateReply(item.id, !item.hidden)}
                        className="text-[11px] font-semibold uppercase text-caisbe-red"
                      >
                        {item.hidden ? "Restore" : "Hide"}
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap leading-6 text-caisbe-text">{item.body}</p>
                  </article>
                ))}
              </div>
              <form onSubmit={(event) => void sendReply(event)} className="flex gap-2 border-t border-ifma-border p-4">
                <textarea
                  required
                  rows={2}
                  maxLength={8000}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Reply as staff…"
                  className="min-h-[44px] flex-1 rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy || !reply.trim()}
                  className="self-end rounded-md border-2 border-caisbe-red bg-caisbe-red px-4 py-2 text-sm font-semibold uppercase text-white disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-caisbe-muted">
              Select a discussion to pin, lock, hide, or restore it.
            </div>
          )}
        </section>
      </div>
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
    </div>
  );
}
