"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHero, sectionSpacingClassName } from "@/components/pages/ContentPage";
import { fetchPublishedMedia, type MediaAsset } from "@/lib/api";
import { getMediaItem } from "@/lib/data/resources";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Channel = "youtube" | "podcast" | "blog";

const CHANNEL_META_FR: Record<
  Channel,
  { empty: string; cta: string; sectionTitle: string }
> = {
  youtube: {
    empty: "Les vidéos apparaîtront ici dès leur publication.",
    cta: "Regarder sur YouTube",
    sectionTitle: "Dernières vidéos",
  },
  podcast: {
    empty: "Les épisodes du balado apparaîtront ici dès leur publication.",
    cta: "Écouter",
    sectionTitle: "Derniers épisodes",
  },
  blog: {
    empty: "Les articles du blogue apparaîtront ici dès leur publication.",
    cta: "Lire l’article",
    sectionTitle: "Derniers articles",
  },
};

const CHANNEL_META: Record<
  Channel,
  { empty: string; cta: string; sectionTitle: string }
> = {
  youtube: {
    empty: "Videos will appear here once published in the admin media library.",
    cta: "Watch on YouTube",
    sectionTitle: "Latest videos",
  },
  podcast: {
    empty: "Podcast episodes will appear here once published in the admin media library.",
    cta: "Listen",
    sectionTitle: "Latest episodes",
  },
  blog: {
    empty: "Blog posts will appear here once published in the admin media library.",
    cta: "Read article",
    sectionTitle: "Latest posts",
  },
};

export default function MediaChannelPageContent({
  channel,
  title,
  lead,
  sectionTitle,
}: {
  channel: Channel;
  title?: string;
  lead?: string;
  sectionTitle?: string;
}) {
  const locale = useLocale();
  const fr = locale === "fr";
  const item = getMediaItem(channel, locale);
  const meta = (fr ? CHANNEL_META_FR : CHANNEL_META)[channel];
  const [rows, setRows] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setRows(await fetchPublishedMedia(channel, { locale }));
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [channel, locale]);

  if (!item) return null;

  return (
    <>
      <PageHero
        eyebrow={fr ? "Médias" : "Media"}
        title={title?.trim() || item.title}
        lead={lead?.trim() || item.lead}
      />

      <section className={`bg-transparent ${sectionSpacingClassName}`}>
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
            {sectionTitle?.trim() || meta.sectionTitle}
          </h2>
          {loading ? (
            <p className="mt-6 text-sm text-caisbe-muted">{fr ? "Chargement…" : "Loading…"}</p>
          ) : rows.length === 0 ? (
            <p className="mt-6 text-sm text-caisbe-muted">{meta.empty}</p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => {
                const href =
                  channel === "blog"
                    ? `/resources/blog/${row.id}`
                    : row.external_url || row.file_url || "#";
                const external = channel !== "blog";
                return (
                  <article
                    key={row.id}
                    className="flex flex-col overflow-hidden rounded-none bg-white shadow-hopewell"
                  >
                    {row.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.cover_url}
                        alt=""
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-[#fafaf8]">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
                          {item.title}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-hopewell-display text-lg font-bold tracking-tight text-ifma-navy">
                        {row.title}
                      </h3>
                      {row.description ? (
                        <p className="mt-3 flex-1 text-sm leading-6 text-ifma-muted line-clamp-3">
                          {row.description}
                        </p>
                      ) : (
                        <div className="flex-1" />
                      )}
                      {external ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
                        >
                          {meta.cta}
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className="mt-6 text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
                        >
                          {meta.cta}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
