"use client";

import { createContext, useContext, type ReactNode } from "react";
import { type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Active site language inside client components (and while server-rendering them). */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Choose the English or French text for the active language. */
export function useT() {
  const locale = useLocale();
  return <V,>(en: V, fr: V): V => (locale === "fr" ? fr : en);
}

/** Translate literal English strings with a French lookup table (English when missing). */
export function useTranslate(map: Record<string, string>) {
  const locale = useLocale();
  return (text: string): string => (locale === "fr" ? (map[text] ?? text) : text);
}

/** Inline translated text for use inside shared server components. */
export function T({ en, fr }: { en: string; fr: string }) {
  return <>{useLocale() === "fr" ? fr : en}</>;
}
