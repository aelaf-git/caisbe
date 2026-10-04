import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-[20px] bg-admin-surface px-6 py-10 text-center shadow-hopewell">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-caisbe-red/10 text-caisbe-red">
        <span aria-hidden className="text-xl leading-none">
          {icon ?? "+"}
        </span>
      </div>
      <h3 className="font-hopewell-display mt-4 text-lg font-bold text-caisbe-text-dark">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-caisbe-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
