import type { ReactNode } from "react";

export const fieldClassName =
  "h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm text-caisbe-text outline-none placeholder:text-caisbe-muted/70 focus:border-caisbe-red";

export const textAreaClassName =
  "w-full rounded-md border border-ifma-border bg-white px-3 py-2.5 text-sm text-caisbe-text outline-none placeholder:text-caisbe-muted/70 focus:border-caisbe-red";

export default function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-caisbe-text">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-5 text-caisbe-muted">{hint}</span> : null}
    </label>
  );
}
