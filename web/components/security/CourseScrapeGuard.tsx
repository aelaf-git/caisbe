"use client";

import { useEffect, useRef, type ReactNode } from "react";

const BLOCKED_KEYS = new Set(["c", "x", "p", "s", "u"]);

export default function CourseScrapeGuard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prevent = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;
      if (mod && BLOCKED_KEYS.has(key)) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (mod && event.shiftKey && (key === "i" || key === "j" || key === "c")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    root.addEventListener("copy", prevent);
    root.addEventListener("cut", prevent);
    root.addEventListener("contextmenu", prevent);
    root.addEventListener("dragstart", prevent);
    root.addEventListener("selectstart", prevent);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      root.removeEventListener("copy", prevent);
      root.removeEventListener("cut", prevent);
      root.removeEventListener("contextmenu", prevent);
      root.removeEventListener("dragstart", prevent);
      root.removeEventListener("selectstart", prevent);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-nosnippet
      className={`select-none print:hidden ${className}`}
    >
      {children}
    </div>
  );
}
