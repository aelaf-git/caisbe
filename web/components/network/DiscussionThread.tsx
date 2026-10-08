"use client";

import { useEffect, useState } from "react";
import { PageHero } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  fetchForumThread,
  formatForumTime,
  portalForumThreadUrl,
  type ForumThreadDetail,
} from "@/lib/forum";

export default function DiscussionThread({
  boardSlug,
  threadId,
}: {
  boardSlug: string;
  threadId: string;
}) {
  const [thread, setThread] = useState<ForumThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchForumThread(threadId);
        if (cancelled) return;
        if (data.board_slug !== boardSlug) {
          setThread(null);
          setError("Discussion not found.");
          return;
        }
        setThread(data);
      } catch (err) {
        if (!cancelled) {
          setThread(null);
          setError(err instanceof Error ? err.message : "Unable to load this discussion.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [boardSlug, threadId]);

  const backHref = `/network/discussion-forum/${boardSlug}`;

  if (loading) {
    return (
      <PageHero eyebrow="Discussion Forum" title="Loading discussion…" backHref={backHref} backLabel="Back to board" />
    );
  }

  if (error || !thread) {
    return (
      <PageHero
        eyebrow="Discussion Forum"
        title="Discussion not found"
        lead={error || "This discussion is not available."}
        backHref={backHref}
        backLabel="Back to board"
      />
    );
  }

  return (
    <>
      <PageHero
        eyebrow={thread.category_title || "Discussion Forum"}
        title={thread.title}
        lead={`${thread.author_name} · ${formatForumTime(thread.created_at)}`}
        backHref={backHref}
        backLabel={thread.board_title || "Back to board"}
        actions={
          thread.locked ? (
            <p className="text-sm font-medium text-caisbe-muted">This discussion is locked.</p>
          ) : (
            <ButtonLink href={portalForumThreadUrl(thread.board_slug, thread.id)} variant="primary">
              Reply
            </ButtonLink>
          )
        }
      >
        <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-caisbe-text">{thread.body}</p>
      </PageHero>
      <section className="bg-transparent py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">Replies</h2>
          {thread.replies.length === 0 ? (
            <p className="mt-4 text-sm text-caisbe-muted">No replies yet.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {thread.replies.map((reply) => (
                <li key={reply.id} className="rounded-[20px] bg-white px-5 py-4 shadow-hopewell">
                  <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                    {reply.author_name} · {formatForumTime(reply.created_at)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-caisbe-text">{reply.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
