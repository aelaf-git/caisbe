"use client";

import { useEffect, useState } from "react";
import { PageHero, sectionSpacingClassName } from "@/components/pages/ContentPage";
import { fetchPublishedForms, type MediaAsset } from "@/lib/api";

function fileLabelFromUrl(url: string | null): string {
  if (!url) return "Download";
  const path = url.split("?")[0] ?? url;
  const name = path.split("/").pop() ?? "Download";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export default function FormsGuidesPageContent({
  title = "Forms and Guides",
  lead = "Download CAISBE forms, templates, and practical guides for members, chapters, and facility professionals.",
}: {
  title?: string;
  lead?: string;
}) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setItems(await fetchPublishedForms());
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <>
      <PageHero eyebrow="Resources" title={title} lead={lead} />

      <section className={`bg-transparent ${sectionSpacingClassName}`}>
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
            Available downloads
          </h2>
          {loading ? (
            <p className="mt-6 text-sm text-caisbe-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="mt-6 text-sm text-caisbe-muted">
              Forms and guides will appear here once published in the admin media library.
            </p>
          ) : (
            <ul className="mt-8 divide-y divide-ifma-border-light overflow-hidden rounded-[20px] bg-white shadow-hopewell">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-hopewell-display text-lg font-bold tracking-tight text-ifma-navy">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-6 text-ifma-muted">{item.description}</p>
                    ) : null}
                    {item.file_url ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                        {fileLabelFromUrl(item.file_url)}
                      </p>
                    ) : null}
                  </div>
                  {item.file_url ? (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
                    >
                      Download
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
