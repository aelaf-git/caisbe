"use client";

import { useEffect, useId, useRef } from "react";
import { buttonStyles } from "@/components/ui/Button";

export type NoticeTone = "success" | "error" | "info";

type NoticeDialogProps = {
  open: boolean;
  tone?: NoticeTone;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
};

const TONE_BADGE: Record<NoticeTone, string> = {
  success: "bg-admin-success-soft text-admin-success",
  error: "bg-caisbe-red/10 text-caisbe-red",
  info: "bg-admin-info-soft text-admin-info",
};

const TONE_MARK: Record<NoticeTone, string> = {
  success: "✓",
  error: "!",
  info: "i",
};

export default function NoticeDialog({
  open,
  tone = "info",
  title,
  description,
  confirmLabel = "OK",
  onClose,
}: NoticeDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    okRef.current?.focus();
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-caisbe-text/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-[101] w-full max-w-md rounded-2xl border border-ifma-border bg-admin-surface p-6 shadow-brand-card sm:p-7"
      >
        <div
          className={`flex size-11 items-center justify-center rounded-full text-xl font-semibold ${TONE_BADGE[tone]}`}
          aria-hidden
        >
          {TONE_MARK[tone]}
        </div>
        <h2 id={titleId} className="mt-4 font-display text-xl font-semibold text-caisbe-text-dark">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-caisbe-muted">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={okRef}
            type="button"
            onClick={onClose}
            className={buttonStyles({ variant: "primary" })}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
