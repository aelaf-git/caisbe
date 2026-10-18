"use client";

import { useEffect, useState } from "react";
import { PageHero, sectionSpacingClassName } from "@/components/pages/ContentPage";
import { fetchPublishedForms, type MediaAsset } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { IconGlyph } from "@/components/ui/IconAction";

function fileLabelFromUrl(url: string | null): string {
  if (!url) return "";
  const path = url.split("?")[0] ?? url;
  const name = path.split("/").pop() ?? "";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export default function FormsGuidesPageContent({
  title,
  lead,
}: {
  title?: string;
  lead?: string;
}) {
  const locale = useLocale();
  const fr = locale === "fr";
  title = title ?? (fr ? "Formulaires et guides" : "Forms and Guides");
  lead =
    lead ??
    (fr
      ? "Téléchargez les formulaires, les modèles et les guides pratiques du CAISBE pour les membres, les sections et les professionnels des installations."
      : "Download CAISBE forms, templates, and practical guides for members, chapters, and facility professionals.");
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setItems(await fetchPublishedForms({ locale }));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [locale]);

  return (
    <>
      <PageHero eyebrow={fr ? "Ressources" : "Resources"} title={title} lead={lead} />

      <section className={`bg-transparent ${sectionSpacingClassName}`}>
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
            {fr ? "Téléchargements disponibles" : "Available downloads"}
          </h2>
          {loading ? (
            <p className="mt-6 text-sm text-caisbe-muted">{fr ? "Chargement…" : "Loading…"}</p>
          ) : items.length === 0 ? (
            <p className="mt-6 text-sm text-caisbe-muted">
              {fr
                ? "Les formulaires et les guides apparaîtront ici dès leur publication."
                : "Forms and guides will appear here once published in the admin media library."}
            </p>
          ) : (
            <ul className="mt-8 divide-y divide-ifma-border-light overflow-hidden rounded-none bg-white shadow-hopewell">
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
                      title={fr ? "Télécharger" : "Download"}
                      aria-label={`${fr ? "Télécharger" : "Download"} ${item.title}`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-caisbe-red text-white hover:bg-caisbe-red-dark"
                    >
                      <IconGlyph icon="download" />
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
