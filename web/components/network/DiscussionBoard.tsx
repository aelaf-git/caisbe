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
import { useT } from "@/lib/i18n/LocaleProvider";

export default function DiscussionBoard({ slug }: { slug: string }) {
  const t = useT();
  const [board, setBoard] = useState<ForumBoardSummary | null>(null);
  const [categoryTitle, setCategoryTitle] = useState<string | null>(null);
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
        eyebrow={t("Discussion Forum", "Forum de discussion")}
        title={t("Loading board…", "Chargement du forum…")}
        backHref="/network/discussion-forum"
        backLabel={t("Forum home", "Accueil du forum")}
      />
    );
  }

  if (missing || !board) {
    return (
      <PageHero
        eyebrow={t("Discussion Forum", "Forum de discussion")}
        title={t("Board not found", "Forum introuvable")}
        lead={t("This discussion board is not available.", "Ce forum de discussion n’est pas disponible.")}
        backHref="/network/discussion-forum"
        backLabel={t("Forum home", "Accueil du forum")}
      />
    );
  }

  return (
    <PageHero
      eyebrow={categoryTitle ?? t("Discussion Forum", "Forum de discussion")}
      title={board.title}
      lead={board.description}
      backHref="/network/discussion-forum"
      backLabel={t("Forum home", "Accueil du forum")}
      actions={
        <>
          <ButtonLink href={portalForumLoginUrl(nextPath)} variant="primary">
            {t("Login", "Connexion")}
          </ButtonLink>
          <ButtonLink href={portalForumRegisterUrl(nextPath)} variant="secondary">
            {t("Register", "S’inscrire")}
          </ButtonLink>
        </>
      }
    >
      <p className="mt-6 max-w-2xl text-base leading-7 text-caisbe-muted">
        {t(
          "You must be logged in to read and take part in this discussion. Sign in with your student portal account to open the board.",
          "Vous devez être connecté pour lire cette discussion et y participer. Connectez-vous avec votre compte du portail étudiant pour ouvrir le forum.",
        )}
      </p>
    </PageHero>
  );
}
