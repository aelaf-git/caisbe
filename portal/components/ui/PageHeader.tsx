import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-3 inline-flex rounded-full bg-caisbe-red/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-caisbe-red-dark">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-caisbe-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
