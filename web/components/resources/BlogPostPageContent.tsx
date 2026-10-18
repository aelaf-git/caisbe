"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import { fetchPublishedMediaAsset, type MediaAsset } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function BlogPostPageContent({ id }: { id: number }) {
  const locale = useLocale();
  const fr = locale === "fr";
  const [post, setPost] = useState<MediaAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const row = await fetchPublishedMediaAsset(id, locale);
        if (row.category !== "blog") {
          setError(fr ? "Article introuvable." : "Post not found.");
          setPost(null);
        } else {
          setPost(row);
          setError(null);
        }
      } catch {
        setError(fr ? "Article introuvable." : "Post not found.");
        setPost(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, locale]);

  if (loading) {
    return (
      <PageHero
        eyebrow={fr ? "Blogue" : "Blog"}
        title={fr ? "Chargement…" : "Loading…"}
        lead={fr ? "Ouverture de cet article." : "Opening this article."}
      />
    );
  }

  if (error || !post) {
    return (
      <>
        <PageHero
          eyebrow={fr ? "Blogue" : "Blog"}
          title={fr ? "Article introuvable" : "Post not found"}
          lead={
            fr
              ? "Cet article a peut-être été retiré ou dépublié."
              : "This article may have been unpublished or removed."
          }
          backHref="/resources/blog"
          backLabel={fr ? "Retour au blogue" : "Back to blog"}
        />
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow={fr ? "Blogue" : "Blog"}
        title={post.title}
        lead={post.description || undefined}
        backHref="/resources/blog"
        backLabel={fr ? "Retour au blogue" : "Back to blog"}
      />
      {post.cover_url ? (
        <section className="bg-transparent pb-4 pt-0 md:pb-8">
          <div className="mx-auto max-w-7xl px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_url}
              alt=""
              className="aspect-[21/9] w-full max-w-4xl rounded-none object-cover shadow-hopewell"
            />
          </div>
        </section>
      ) : null}
      <ContentSection className="!pt-8 md:!pt-12">
        <article className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-caisbe-text md:text-lg">
          {post.body}
        </article>
        <p className="mt-10">
          <Link
            href="/resources/blog"
            className="text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
          >
            {fr ? "Plus d’articles du blogue" : "More blog posts"}
          </Link>
        </p>
      </ContentSection>
    </>
  );
}
