"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export default function LanguageSwitch({
  locale,
  className = "",
}: {
  locale: Locale;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectLanguage(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={locale === "fr" ? "Sélecteur de langue" : "Language selector"}
      className={`inline-flex items-center rounded-full border border-ifma-border-light bg-[#f8fafc] p-0.5 text-xs font-bold tracking-wider ${className}`}
    >
      {(["en", "fr"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            disabled={isPending}
            onClick={() => selectLanguage(code)}
            aria-pressed={active}
            title={code === "fr" ? "Français" : "English"}
            className={`rounded-full px-2.5 py-1 uppercase transition ${
              active
                ? "bg-caisbe-red text-white shadow-xs"
                : "text-caisbe-text hover:text-caisbe-red"
            } disabled:opacity-60`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
