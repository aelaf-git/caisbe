"use client";

import { useEffect, useState } from "react";
import { PageHero, sectionSpacingClassName } from "@/components/pages/ContentPage";
import { fetchPublishedMagazines, type MediaAsset } from "@/lib/api";
import { getMediaItem } from "@/lib/data/resources";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function MagazinePageContent({
  title,
  lead,
  sectionTitle,
}: {
  title?: string;
  lead?: string;
  sectionTitle?: string;
}) {
  const locale = useLocale();
  const fr = locale === "fr";
  const item = getMediaItem("magazine", locale);
  const [issues, setIssues] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIssues(await fetchPublishedMagazines({ locale }));
      } catch {
        setIssues([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [locale]);

  if (!item) return null;

  return (
    <>
      <PageHero
        eyebrow={fr ? "Ressources" : "Resources"}
        title={title?.trim() || item.title}
        lead={lead?.trim() || item.lead}
      />

      <section className={`bg-transparent ${sectionSpacingClassName}`}>
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
            {sectionTitle ?? (fr ? "Derniers numéros" : "Latest issues")}
          </h2>
          {loading ? (
            <p className="mt-6 text-sm text-caisbe-muted">{fr ? "Chargement…" : "Loading…"}</p>
          ) : issues.length === 0 ? (
            <p className="mt-6 text-sm text-caisbe-muted">
              {fr
                ? "Les numéros du magazine apparaîtront ici dès leur publication."
                : "Magazine issues will appear here once published in the admin media library."}
            </p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {issues.map((issue) => (
                <article
                  key={issue.id}
                  className="flex flex-col overflow-hidden rounded-[20px] bg-white shadow-hopewell"
                >
                  {issue.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={issue.cover_url}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-[#fafaf8]">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
                        {fr ? "Magazine" : "Magazine"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-hopewell-display text-lg font-bold tracking-tight text-ifma-navy">
                      {issue.title}
                    </h3>
                    {issue.description ? (
                      <p className="mt-3 flex-1 text-sm leading-6 text-ifma-muted">{issue.description}</p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <a
                      href={issue.file_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
                    >
                      {fr ? "Télécharger / lire" : "Download / read"}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
