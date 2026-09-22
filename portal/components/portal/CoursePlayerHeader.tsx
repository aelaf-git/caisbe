import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import ProgressBar from "@/components/portal/ProgressBar";

export default function CoursePlayerHeader({
  code,
  title,
  progress,
  certificateCode,
  coverUrl,
}: {
  code: string;
  title: string;
  progress: number;
  certificateCode?: string | null;
  coverUrl?: string | null;
}) {
  return (
    <header className="overflow-hidden border border-ifma-border bg-white shadow-brand-card">
      {coverUrl ? (
        <div className="relative aspect-[21/6] max-h-40 w-full overflow-hidden bg-[#f3f0ec] md:aspect-[28/6] md:max-h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <BackButton href="/courses" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{code}</p>
              <h1 className="font-display text-2xl font-semibold text-caisbe-text-dark md:text-3xl">
                {title}
              </h1>
            </div>
          </div>
          {certificateCode ? (
            <Link
              href={`/certificates/${certificateCode}`}
              className="shrink-0 rounded-md border-2 border-caisbe-red px-4 py-2 text-sm font-semibold uppercase text-caisbe-red hover:bg-caisbe-red hover:text-white"
            >
              View certificate
            </Link>
          ) : null}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={progress} className="h-2.5 flex-1" />
          <span className="shrink-0 text-sm font-semibold tabular-nums text-caisbe-text">{progress}%</span>
        </div>
      </div>
    </header>
  );
}
