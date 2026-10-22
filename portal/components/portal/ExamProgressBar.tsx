"use client";

export default function ExamProgressBar({
  answeredCount,
  total,
}: {
  answeredCount: number;
  total: number;
}) {
  const safeTotal = Math.max(0, total);
  const safeAnswered = Math.min(Math.max(0, answeredCount), safeTotal);
  const percent = safeTotal === 0 ? 0 : Math.round((safeAnswered / safeTotal) * 100);
  const complete = safeTotal > 0 && safeAnswered === safeTotal;

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-4 border-b border-ifma-border bg-white/95 px-1 py-3 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-text-dark">
          Progress: {safeAnswered} / {safeTotal} Questions Completed
        </p>
        <p
          className={`text-xs font-semibold tabular-nums ${
            complete ? "text-admin-success" : "text-caisbe-muted"
          }`}
        >
          {percent}%
        </p>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-sm bg-admin-canvas"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Exam progress ${safeAnswered} of ${safeTotal} questions completed`}
      >
        <div
          className={`h-full transition-[width] duration-300 ease-out ${
            complete ? "bg-admin-success" : "bg-caisbe-red"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
