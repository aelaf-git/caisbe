"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ContentSection } from "@/components/pages/ContentPage";
import {
  fetchForumCategories,
  formatForumTime,
  type ForumCategory,
} from "@/lib/forum";

export default function DiscussionForumHome() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchForumCategories();
        if (!cancelled) setCategories(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load the forum.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ContentSection
      id="forum"
      title="Home"
      description="Choose a board to read discussions. Sign in through the member portal to start a discussion or reply."
    >
      {loading ? <p className="text-sm text-caisbe-muted">Loading forum…</p> : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {!loading && !error ? (
        <div className="space-y-8">
          {categories.map((category) => (
            <section
              key={category.id}
              className="overflow-hidden rounded-[20px] bg-white shadow-hopewell"
            >
              <h3 className="font-hopewell-display bg-caisbe-red px-5 py-3 text-lg font-bold text-white">
                {category.title}
              </h3>
              <ul className="divide-y divide-ifma-border">
                {category.boards.map((board) => (
                  <li key={board.id}>
                    <Link
                      href={`/network/discussion-forum/${board.slug}`}
                      className="flex flex-col gap-3 px-5 py-4 transition hover:bg-[#fafafa] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-caisbe-text-dark">{board.title}</p>
                        <p className="mt-1 text-sm leading-6 text-caisbe-muted">{board.description}</p>
                        {board.last_thread_title ? (
                          <p className="mt-2 text-xs text-caisbe-muted">
                            Latest: {board.last_thread_title}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-sm text-caisbe-muted sm:text-right">
                        <p className="font-semibold text-caisbe-text">
                          {board.thread_count}{" "}
                          {board.thread_count === 1 ? "discussion" : "discussions"}
                        </p>
                        <p className="mt-1">
                          {board.last_activity_at
                            ? formatForumTime(board.last_activity_at)
                            : "No activity yet"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </ContentSection>
  );
}
