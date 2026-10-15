import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

export const OG_LOCALE: Record<Locale, string> = { en: "en_CA", fr: "fr_CA" };

function withLang(path: string, lang: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${clean}${clean.includes("?") ? "&" : "?"}lang=${lang}`;
}

/**
 * Canonical and hreflang alternates for a public path. The site serves both languages from the
 * same URL (cookie toggle), so `?lang=en|fr` gives crawlers a stable, linkable URL per language.
 */
export function localeAlternates(path: string, locale: Locale): Metadata {
  return {
    alternates: {
      canonical: withLang(path, locale),
      languages: {
        "en-CA": withLang(path, "en"),
        "fr-CA": withLang(path, "fr"),
        "x-default": path.startsWith("/") ? path : `/${path}`,
      },
    },
    openGraph: { locale: OG_LOCALE[locale], alternateLocale: [OG_LOCALE[locale === "fr" ? "en" : "fr"]] },
  };
}
