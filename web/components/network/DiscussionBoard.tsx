"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  fetchForumBoard,
  formatForumTime,
  portalForumBoardUrl,
  type ForumBoardDetail,
} from "@/lib/forum";

export default function DiscussionBoard({ slug }: { slug: string }) {
  const [board, setBoard] = useState<ForumBoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchForumBoard(slug);
        if (!cancelled) setBoard(data);
      } catch (err) {
        if (!cancelled) {
          setBoard(null);
          setError(err instanceof Error ? err.message : "Unable to load this board.");
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

  if (loading) {
    return (
      <PageHero eyebrow="Discussion Forum" title="Loading board…" backHref="/network/discussion-forum" backLabel="Forum home" />
    );
  }

  if (error || !board) {
    return (
      <PageHero
        eyebrow="Discussion Forum"
        title="Board not found"
        lead={error || "This discussion board is not available."}
        backHref="/network/discussion-forum"
        backLabel="Forum home"
      />
    );
  }

  return (
    <>
      <PageHero
        eyebrow={board.category_title || "Discussion Forum"}
        title={board.title}
        lead={board.description}
        backHref="/network/discussion-forum"
        backLabel="Forum home"
        actions={
          board.member_can_start ? (
            <ButtonLink href={portalForumBoardUrl(board.slug)} variant="primary">
              Start a discussion
            </ButtonLink>
          ) : (
            <p className="text-sm font-medium text-caisbe-muted">
              New discussions in this board are posted by CAISBE staff.
            </p>
          )
        }
      />
      <section className="bg-transparent py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          {board.threads.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-ifma-border bg-white px-6 py-12 text-center shadow-hopewell">
              <p className="text-base leading-7 text-caisbe-muted">No discussions yet.</p>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-[20px] bg-white shadow-hopewell">
              {board.threads.map((thread) => (
                <li key={thread.id} className="border-b border-ifma-border last:border-b-0">
                  <Link
                    href={`/network/discussion-forum/${board.slug}/${thread.id}`}
                    className="block px-5 py-4 transition hover:bg-[#fafafa]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {thread.pinned ? (
                        <span className="rounded-full bg-caisbe-red/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-caisbe-red-dark">
                          Pinned
                        </span>
                      ) : null}
                      {thread.locked ? (
                        <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-caisbe-muted">
                          Locked
                        </span>
                      ) : null}
                      <p className="font-semibold text-caisbe-text-dark">{thread.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-caisbe-muted">
                      {thread.author_name} · {formatForumTime(thread.created_at)} ·{" "}
                      {thread.reply_count} {thread.reply_count === 1 ? "reply" : "replies"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
