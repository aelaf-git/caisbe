"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { ApiError, apiFetch } from "@/lib/auth";
import { formatForumTime, type ForumCategory } from "@/lib/forum";

export default function ForumHomePage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<ForumCategory[]>("/forum/categories");
        if (!cancelled) setCategories(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Unable to load the forum.");
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network"
        title="Discussion forum"
        description="Home is the forum index. Open a board to read discussions, start one, or reply."
      />
      {loading ? <p className="text-sm text-caisbe-muted">Loading forum…</p> : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      <div className="space-y-6">
        {categories.map((category) => (
          <section key={category.id} className="overflow-hidden rounded-[20px] bg-admin-surface shadow-hopewell">
            <h2 className="font-display bg-caisbe-red px-5 py-3 text-lg font-bold text-white">
              {category.title}
            </h2>
            <ul className="divide-y divide-ifma-border">
              {category.boards.map((board) => (
                <li key={board.id}>
                  <Link
                    href={`/forum/${board.slug}`}
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-admin-canvas sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-caisbe-text-dark">{board.title}</p>
                      <p className="mt-1 text-sm leading-6 text-caisbe-muted">{board.description}</p>
                    </div>
                    <div className="shrink-0 text-sm text-caisbe-muted sm:text-right">
                      <p className="font-semibold text-caisbe-text">
                        {board.thread_count} {board.thread_count === 1 ? "discussion" : "discussions"}
                      </p>
                      <p className="mt-1">
                        {board.last_activity_at ? formatForumTime(board.last_activity_at) : "No activity yet"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
