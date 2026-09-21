import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-ifma-border bg-white px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-caisbe-red shadow-sm">
        <span aria-hidden className="text-xl">+</span>
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-caisbe-text-dark">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-caisbe-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
