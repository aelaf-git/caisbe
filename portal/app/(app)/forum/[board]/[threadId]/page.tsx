"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { ApiError, apiFetch } from "@/lib/auth";
import { formatForumTime, type ForumReply, type ForumThreadDetail } from "@/lib/forum";

export default function ForumThreadPage() {
  const params = useParams<{ board: string; threadId: string }>();
  const boardSlug = params.board;
  const threadId = params.threadId;
  const [thread, setThread] = useState<ForumThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<ForumThreadDetail>(`/forum/threads/${encodeURIComponent(threadId)}`);
      if (data.board_slug !== boardSlug) {
        setThread(null);
        setError("Discussion not found.");
        return;
      }
      setThread(data);
    } catch (err) {
      setThread(null);
      setError(err instanceof ApiError ? err.detail : "Unable to load this discussion.");
    } finally {
      setLoading(false);
    }
  }, [boardSlug, threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!thread || busy || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch<ForumReply>(`/forum/threads/${thread.id}/replies`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      setReply("");
      setThread((current) =>
        current ? { ...current, replies: [...current.replies, created] } : current,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to post this reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={thread?.category_title || "Discussion forum"}
        title={loading ? "Loading discussion…" : thread?.title || "Discussion"}
        description={
          thread ? `${thread.author_name} · ${formatForumTime(thread.created_at)}` : undefined
        }
        actions={
          <Link
            href={`/forum/${boardSlug}`}
            className="text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
          >
            {thread?.board_title || "Back to board"}
          </Link>
        }
      />
      {loading ? <p className="text-sm text-caisbe-muted">Loading discussion…</p> : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      {thread ? (
        <>
          <article className="rounded-[20px] border border-ifma-border bg-admin-surface px-5 py-4 shadow-hopewell">
            <p className="whitespace-pre-wrap text-sm leading-6 text-caisbe-text">{thread.body}</p>
          </article>
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Replies</h2>
            {thread.replies.length === 0 ? (
              <p className="text-sm text-caisbe-muted">No replies yet.</p>
            ) : (
              thread.replies.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[20px] border border-ifma-border bg-admin-surface px-5 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                    {item.author_name} · {formatForumTime(item.created_at)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-caisbe-text">{item.body}</p>
                </article>
              ))
            )}
          </section>
          {thread.locked ? (
            <p className="rounded-[20px] border border-ifma-border bg-admin-surface px-5 py-4 text-sm text-caisbe-muted">
              This discussion is locked. New replies are closed.
            </p>
          ) : (
            <form
              onSubmit={(event) => void sendReply(event)}
              className="rounded-[20px] border border-ifma-border bg-admin-surface p-5 shadow-hopewell"
            >
              <label className="block text-sm font-semibold text-caisbe-text">
                Reply
                <textarea
                  required
                  rows={4}
                  maxLength={8000}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !reply.trim()}
                className="mt-4 rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 py-2 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
              >
                {busy ? "Posting…" : "Post reply"}
              </button>
            </form>
          )}
        </>
      ) : null}
    </div>
  );
}
