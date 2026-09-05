"use client";

import { useEffect, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import { fetchPublishedMagazines, type MediaAsset } from "@/lib/api";

export default function MagazineSection() {
  const [issues, setIssues] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        let featured = await fetchPublishedMagazines({ featured: true });
        if (featured.length === 0) {
          featured = await fetchPublishedMagazines();
        }
        setIssues(featured.slice(0, 3));
      } catch {
        setIssues([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold text-caisbe-text-dark md:text-4xl">
              CAISBE Magazine
            </h2>
            <p className="mt-2 text-lg text-ifma-muted">
              Read the latest features and insights from across the CAISBE community.
            </p>
          </div>
          <ButtonLink href="/resources/magazine" variant="text">
            View all issues
          </ButtonLink>
        </div>

        {loading ? (
          <p className="text-sm text-caisbe-muted">Loading magazine issues…</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-caisbe-muted">
            New magazine issues will appear here once published by the CAISBE team.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {issues.map((issue) => (
              <article
                key={issue.id}
                className="shadow-brand-card flex flex-col overflow-hidden border border-ifma-border-light bg-white transition-colors hover:border-caisbe-red"
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
                  <h3 className="text-lg font-semibold leading-snug text-ifma-navy">{issue.title}</h3>
                  {issue.description ? (
                    <p className="mt-3 flex-1 text-sm leading-6 text-ifma-muted">{issue.description}</p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <a
                    href={issue.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
                  >
                    Read issue
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 border-t border-ifma-border-light pt-10">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="font-display text-xl font-semibold text-caisbe-text-dark">
              Stay updated
            </h3>
            <p className="mt-2 text-sm text-caisbe-muted">
              Subscribe for new magazine issues and CAISBE news.
            </p>
            <div className="mt-6">
              <NewsletterSignup compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
