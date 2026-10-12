"use client";

import { useEffect, useState } from "react";
import { PageHero } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  fetchForumCategories,
  portalForumLoginUrl,
  portalForumRegisterUrl,
  type ForumBoardSummary,
} from "@/lib/forum";

export default function DiscussionBoard({ slug }: { slug: string }) {
  const [board, setBoard] = useState<ForumBoardSummary | null>(null);
  const [categoryTitle, setCategoryTitle] = useState("Discussion Forum");
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setMissing(false);
      try {
        const categories = await fetchForumCategories();
        const match = categories
          .flatMap((category) => category.boards.map((item) => ({ category, item })))
          .find((row) => row.item.slug === slug);
        if (cancelled) return;
        if (!match) {
          setBoard(null);
          setMissing(true);
          return;
        }
        setBoard(match.item);
        setCategoryTitle(match.category.title);
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const nextPath = `/forum/${slug}`;

  if (loading) {
    return (
      <PageHero
        eyebrow="Discussion Forum"
        title="Loading board…"
        backHref="/network/discussion-forum"
        backLabel="Forum home"
      />
    );
  }

  if (missing || !board) {
    return (
      <PageHero
        eyebrow="Discussion Forum"
        title="Board not found"
        lead="This discussion board is not available."
        backHref="/network/discussion-forum"
        backLabel="Forum home"
      />
    );
  }

  return (
    <PageHero
      eyebrow={categoryTitle}
      title={board.title}
      lead={board.description}
      backHref="/network/discussion-forum"
      backLabel="Forum home"
      actions={
        <>
          <ButtonLink href={portalForumLoginUrl(nextPath)} variant="primary">
            Login
          </ButtonLink>
          <ButtonLink href={portalForumRegisterUrl(nextPath)} variant="secondary">
            Register
          </ButtonLink>
        </>
      }
    >
      <p className="mt-6 max-w-2xl text-base leading-7 text-caisbe-muted">
        You must be logged in to read and take part in this discussion. Sign in with your student
        portal account to open the board.
      </p>
    </PageHero>
  );
}
