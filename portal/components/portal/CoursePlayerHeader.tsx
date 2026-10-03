import Link from "next/link";
import ProgressBar from "@/components/portal/ProgressBar";

export default function CoursePlayerHeader({
  code,
  title,
  progress,
  certificateCode,
  onToggleOutline,
  outlineOpen,
}: {
  code: string;
  title: string;
  progress: number;
  certificateCode?: string | null;
  onToggleOutline?: () => void;
  outlineOpen?: boolean;
}) {
  return (
    <header className="border-b border-ifma-border-light bg-white/95 shadow-hopewell-nav backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <Link
          href="/courses"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-ifma-border px-4 text-sm font-bold text-caisbe-text transition hover:border-caisbe-red hover:text-caisbe-red"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Exit
        </Link>

        {onToggleOutline ? (
          <button
            type="button"
            onClick={onToggleOutline}
            className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-ifma-border px-4 text-sm font-bold text-caisbe-text transition hover:border-caisbe-red hover:text-caisbe-red"
            aria-expanded={outlineOpen}
            aria-controls="course-outline-panel"
            title={outlineOpen ? "Hide course content" : "Show course content"}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {outlineOpen ? (
                <>
                  <path d="M4 6h10" />
                  <path d="M4 12h10" />
                  <path d="M4 18h10" />
                  <path d="M19 8l-4 4 4 4" />
                </>
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
            <span className="hidden sm:inline">{outlineOpen ? "Hide outline" : "Outline"}</span>
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-wider text-caisbe-red">{code}</p>
          <h1 className="truncate font-hopewell-display text-lg font-extrabold tracking-tight text-caisbe-text-dark md:text-xl">
            {title}
          </h1>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto sm:min-w-[200px] sm:max-w-xs sm:flex-1">
          <ProgressBar value={progress} className="h-2 flex-1" />
          <span className="shrink-0 text-sm font-semibold tabular-nums text-caisbe-text">{progress}%</span>
        </div>

        {certificateCode ? (
          <Link
            href={`/certificates/${certificateCode}`}
            className="shrink-0 rounded-full border-2 border-caisbe-red px-4 py-2 text-sm font-bold text-caisbe-red transition hover:bg-caisbe-red hover:text-white"
          >
            Certificate
          </Link>
        ) : null}
      </div>
    </header>
  );
}
