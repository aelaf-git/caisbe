"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { relatedPageHref } from "@/lib/notificationLink";

export type NotificationDialogItem = {
  id: number;
  title: string;
  body: string;
  kind: string;
  link: string | null;
  created_at: string;
};

export default function NotificationDialog({
  item,
  onClose,
}: {
  item: NotificationDialogItem | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = item !== null;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!item) return null;

  const relatedHref = item.link ? relatedPageHref(item.link) : null;
  const externalLink = Boolean(relatedHref && /^https?:\/\//i.test(relatedHref));
  const linkClassName =
    "inline-flex h-11 items-center justify-center rounded-full border-2 border-caisbe-red bg-admin-surface px-6 text-sm font-bold text-caisbe-red transition hover:bg-caisbe-red hover:text-white";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss notification"
        className="absolute inset-0 bg-caisbe-text/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-[101] w-full max-w-lg rounded-[20px] border border-ifma-border bg-admin-surface p-6 shadow-hopewell sm:p-7"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-admin-surface-muted px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-caisbe-text">
            {item.kind.replaceAll("_", " ")}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            {new Date(item.created_at).toLocaleString()}
          </span>
        </div>
        <h2 id={titleId} className="mt-4 font-display text-xl font-semibold text-caisbe-text-dark">
          {item.title}
        </h2>
        <p
          id={descriptionId}
          className="mt-3 whitespace-pre-wrap text-sm leading-6 text-caisbe-muted"
        >
          {item.body}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {relatedHref && externalLink ? (
            <a
              href={relatedHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={linkClassName}
            >
              Open related page
            </a>
          ) : null}
          {relatedHref && !externalLink ? (
            <Link href={relatedHref} onClick={onClose} className={linkClassName}>
              Open related page
            </Link>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white transition hover:bg-caisbe-red-dark"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
