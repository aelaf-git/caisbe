"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const body = {
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      language: typeof navigator !== "undefined" ? navigator.language : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    };

    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Analytics must not interrupt browsing.
    });
  }, [pathname]);

  return null;
}
