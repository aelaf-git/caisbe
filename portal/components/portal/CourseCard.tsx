import Link from "next/link";
import ProgressBar from "@/components/portal/ProgressBar";
import type { Course } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

type PrimaryAction =
  | { href: string; label: string; tone?: "primary" | "complete" }
  | { onClick: () => void; label: string; busy?: boolean; tone?: "primary" | "complete" };

type SecondaryAction =
  | { href: string; label: string }
  | { onClick: () => void; label: string; busy?: boolean };

const primaryClass =
  "inline-flex h-11 w-full items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-4 text-sm font-semibold uppercase text-white transition hover:bg-caisbe-red-dark disabled:opacity-60";
const completeClass =
  "inline-flex h-11 w-full items-center justify-center rounded-md border-2 border-admin-success bg-admin-success-soft px-4 text-sm font-semibold uppercase text-admin-success transition hover:bg-admin-success hover:text-white disabled:opacity-60";
const secondaryClass =
  "inline-flex h-11 w-full items-center justify-center rounded-md border-2 border-caisbe-red bg-admin-surface px-4 text-sm font-semibold uppercase text-caisbe-red transition hover:bg-caisbe-red hover:text-white disabled:opacity-60";

function ActionControl({
  action,
  className,
}: {
  action: PrimaryAction | SecondaryAction;
  className: string;
}) {
  if ("href" in action) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" disabled={action.busy} onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

export default function CourseCard({
  course,
  progress,
  action,
  secondaryAction,
  footer,
}: {
  course: Course;
  progress?: number | null;
  action: PrimaryAction;
  secondaryAction?: SecondaryAction;
  footer?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-5 border border-ifma-border bg-admin-surface p-5 shadow-brand-card md:flex-row md:items-center md:p-6">
      <span className="relative h-36 w-full shrink-0 overflow-hidden rounded-md border border-ifma-border bg-[#fafaf8] sm:h-28 sm:w-44 md:h-24 md:w-40">
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveUploadUrl(course.cover_url) ?? course.cover_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-caisbe-red">
            {course.code.slice(0, 4)}
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{course.code}</p>
          {progress != null ? (
            <span className="inline-flex items-center rounded-md border border-ifma-border bg-admin-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              {progress}% complete
            </span>
          ) : null}
        </div>
        <h3 className="font-display text-xl font-semibold text-caisbe-text-dark">{course.title}</h3>
        {course.description ? (
          <p className="line-clamp-2 text-sm leading-6 text-caisbe-muted">{course.description}</p>
        ) : null}
        {progress != null ? (
          <div className="max-w-sm pt-1">
            <ProgressBar value={progress} />
          </div>
        ) : null}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:max-w-xs md:w-52">
        <ActionControl action={action} className={action.tone === "complete" ? completeClass : primaryClass} />
        {secondaryAction ? <ActionControl action={secondaryAction} className={secondaryClass} /> : null}
        {footer}
      </div>
    </article>
  );
}
