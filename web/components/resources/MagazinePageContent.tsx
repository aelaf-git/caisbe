"use client";

import { useEffect, useState } from "react";
import { PageHero } from "@/components/pages/ContentPage";
import { fetchPublishedMagazines, type MediaAsset } from "@/lib/api";
import { mediaContent } from "@/lib/data/resources";

export default function MagazinePageContent() {
  const item = mediaContent.items.find((row) => row.slug === "magazine");
  const [issues, setIssues] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIssues(await fetchPublishedMagazines());
      } catch {
        setIssues([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (!item) return null;

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title={item.title}
        lead={item.lead}
      />

      <section className="bg-transparent py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
            Latest issues
          </h2>
          {loading ? (
            <p className="mt-6 text-sm text-caisbe-muted">Loading…</p>
          ) : issues.length === 0 ? (
            <p className="mt-6 text-sm text-caisbe-muted">
              Magazine issues will appear here once published in the admin media library.
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
                        Magazine
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
                      Download / read
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
