import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";

export async function getServerLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  } catch {
    return "en";
  }
}

/** Server-side translation helper: `const { t, locale } = await getServerT(); t("Hello", "Bonjour")`. */
export async function getServerT() {
  const locale = await getServerLocale();
  const t = <V,>(en: V, fr: V): V => (locale === "fr" ? fr : en);
  return { locale, t };
}

/** Server-side literal translator backed by an English→French lookup table. */
export async function getServerL(map: Record<string, string>) {
  const locale = await getServerLocale();
  const L = (text: string): string => (locale === "fr" ? (map[text] ?? text) : text);
  return { locale, L };
}
