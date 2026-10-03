"use client";

import type { ButtonHTMLAttributes } from "react";

type SaveButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  dirty: boolean;
  saving?: boolean;
  idleLabel?: string;
  savingLabel?: string;
};

const baseClass =
  "inline-flex h-11 items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:pointer-events-none disabled:opacity-60";

export default function SaveButton({
  dirty,
  saving = false,
  idleLabel = "Save",
  savingLabel = "Saving…",
  disabled,
  type = "button",
  className = "",
  ...props
}: SaveButtonProps) {
  return (
    <button
      type={type}
      disabled={!dirty || saving || Boolean(disabled)}
      className={`${baseClass} ${className}`.trim()}
      {...props}
    >
      {saving ? savingLabel : idleLabel}
    </button>
  );
}
