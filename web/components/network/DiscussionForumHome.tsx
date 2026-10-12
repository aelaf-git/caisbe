"use client";

import { useEffect, useState } from "react";
import { ContentSection } from "@/components/pages/ContentPage";
import {
  fetchForumCategories,
  portalForumBoardUrl,
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
      description="These are the discussion boards. Sign in to the student portal to read discussions, start one, or reply."
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
                    <a
                      href={portalForumBoardUrl(board.slug)}
                      className="flex flex-col gap-2 px-5 py-4 transition hover:bg-[#fafafa] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-caisbe-text-dark">{board.title}</p>
                        <p className="mt-1 text-sm leading-6 text-caisbe-muted">{board.description}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-caisbe-red">Sign in to discuss</p>
                    </a>
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
