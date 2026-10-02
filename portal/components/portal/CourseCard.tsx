import Link from "next/link";
import ProgressBar from "@/components/portal/ProgressBar";
import type { Course } from "@/lib/auth";

type PrimaryAction =
  | { href: string; label: string; tone?: "primary" | "complete" }
  | { onClick: () => void; label: string; busy?: boolean; tone?: "primary" | "complete" };

type SecondaryAction =
  | { href: string; label: string }
  | { onClick: () => void; label: string; busy?: boolean };

const primaryClass =
  "inline-flex h-11 w-full items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:opacity-60";
const completeClass =
  "inline-flex h-11 w-full items-center justify-center rounded-md border-2 border-admin-success bg-admin-success-soft px-4 text-sm font-semibold uppercase tracking-wide text-admin-success hover:bg-admin-success hover:text-white disabled:opacity-60";
const secondaryClass =
  "inline-flex h-11 w-full items-center justify-center rounded-md border-2 border-ifma-border px-4 text-sm font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-60";

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
    <article className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{course.code}</p>
        <h3 className="mt-1 font-display text-lg font-semibold text-caisbe-text-dark">{course.title}</h3>
        {course.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-caisbe-muted">{course.description}</p>
        ) : null}
      </div>
      {progress != null ? (
        <div className="w-full shrink-0 space-y-1.5 md:w-48">
          <div className="flex items-center justify-between text-xs text-caisbe-muted">
            <span>Progress</span>
            <span className="font-semibold tabular-nums text-caisbe-text">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      ) : null}
      <div className="flex w-full shrink-0 flex-col gap-2 sm:max-w-xs md:w-52">
        <ActionControl action={action} className={action.tone === "complete" ? completeClass : primaryClass} />
        {secondaryAction ? <ActionControl action={secondaryAction} className={secondaryClass} /> : null}
        {footer}
      </div>
    </article>
  );
}
