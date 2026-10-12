"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { ApiError, apiFetch } from "@/lib/auth";
import { formatForumTime, type ForumBoardDetail, type ForumThreadDetail } from "@/lib/forum";

export default function ForumBoardPage() {
  const params = useParams<{ board: string }>();
  const slug = params.board;
  const router = useRouter();
  const [board, setBoard] = useState<ForumBoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<ForumBoardDetail>(`/forum/boards/${encodeURIComponent(slug)}`);
        if (!cancelled) setBoard(data);
      } catch (err) {
        if (!cancelled) {
          setBoard(null);
          setError(err instanceof ApiError ? err.detail : "Unable to load this board.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function startDiscussion(event: FormEvent) {
    event.preventDefault();
    if (!board || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch<ForumThreadDetail>(`/forum/boards/${encodeURIComponent(board.slug)}/threads`, {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
      router.push(`/forum/${board.slug}/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to start this discussion.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={board?.category_title || "Discussion forum"}
        title={loading ? "Loading board…" : board?.title || "Board"}
        description={board?.description}
        actions={
          <Link href="/forum" className="text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark">
            Forum home
          </Link>
        }
      />
      {loading ? <p className="text-sm text-caisbe-muted">Loading discussions…</p> : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      {board ? (
        <>
          {board.threads.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-ifma-border bg-admin-surface px-6 py-10 text-center text-sm text-caisbe-muted">
              No discussions yet.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-[20px] border border-ifma-border bg-admin-surface shadow-hopewell">
              {board.threads.map((thread) => (
                <li key={thread.id} className="border-b border-ifma-border last:border-b-0">
                  <Link href={`/forum/${board.slug}/${thread.id}`} className="block px-5 py-4 hover:bg-admin-canvas">
                    <div className="flex flex-wrap items-center gap-2">
                      {thread.pinned ? (
                        <span className="rounded-full bg-caisbe-red/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-caisbe-red-dark">
                          Pinned
                        </span>
                      ) : null}
                      {thread.locked ? (
                        <span className="rounded-full bg-admin-canvas px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-caisbe-muted">
                          Locked
                        </span>
                      ) : null}
                      <p className="font-semibold text-caisbe-text-dark">{thread.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-caisbe-muted">
                      {thread.author_name} · {formatForumTime(thread.last_activity_at)} · {thread.reply_count}{" "}
                      {thread.reply_count === 1 ? "reply" : "replies"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {board.member_can_start ? (
            <section className="rounded-[20px] border border-ifma-border bg-admin-surface p-6 shadow-hopewell">
              <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Start a discussion</h2>
              <form onSubmit={(event) => void startDiscussion(event)} className="mt-4 flex flex-col gap-4">
                <label className="block text-sm font-semibold text-caisbe-text">
                  Title
                  <input
                    required
                    minLength={2}
                    maxLength={200}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-semibold text-caisbe-text">
                  Message
                  <textarea
                    required
                    rows={6}
                    maxLength={8000}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    className="mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-fit rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 py-2 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
                >
                  {busy ? "Posting…" : "Post discussion"}
                </button>
              </form>
            </section>
          ) : (
            <p className="rounded-[20px] border border-ifma-border bg-admin-surface px-5 py-4 text-sm text-caisbe-muted">
              Announcements are posted by CAISBE staff. You can read them here.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
