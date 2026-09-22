import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  titleAccessory?: ReactNode;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  titleAccessory,
  description,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-caisbe-red">{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">
            {title}
          </h1>
          {titleAccessory}
        </div>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-caisbe-muted">{description}</p> : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
