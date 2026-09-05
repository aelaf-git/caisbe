import Link from "next/link";
import ProgressBar from "@/components/portal/ProgressBar";
import type { Course } from "@/lib/auth";

export default function CourseCard({
  course,
  progress,
  action,
}: {
  course: Course;
  progress?: number | null;
  action: { href: string; label: string } | { onClick: () => void; label: string; busy?: boolean };
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden border border-ifma-border bg-white shadow-brand-card">
      <div className="relative aspect-video overflow-hidden bg-[#f3f0ec]">
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-end bg-linear-to-br from-caisbe-red/15 via-white to-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-caisbe-red">{course.code}</p>
            <p className="mt-1 line-clamp-2 font-display text-lg font-semibold text-caisbe-text-dark">
              {course.title}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{course.code}</p>
        <h3 className="mt-1 line-clamp-2 font-display text-lg font-semibold text-caisbe-text-dark">
          {course.title}
        </h3>
        {course.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-caisbe-muted">{course.description}</p>
        ) : null}
        {progress != null ? (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-caisbe-muted">
              <span>Progress</span>
              <span className="font-semibold tabular-nums text-caisbe-text">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        ) : null}
        <div className="mt-auto pt-5">
          {"href" in action ? (
            <Link
              href={action.href}
              className="inline-flex w-full items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              disabled={action.busy}
              onClick={action.onClick}
              className="inline-flex w-full items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:opacity-60"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
