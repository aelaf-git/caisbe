"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-caisbe-text/40"
        disabled={busy}
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-[101] w-full max-w-md border border-ifma-border bg-white p-6 shadow-brand-card"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">Confirm</p>
        <h2 id="confirm-dialog-title" className="mt-2 font-display text-xl font-semibold text-caisbe-green">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-caisbe-muted">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex items-center justify-center border-2 border-ifma-border bg-white px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-green hover:text-caisbe-green disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
