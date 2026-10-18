import { sectionSpacingClassName } from "@/components/pages/ContentPage";
import Link from "next/link";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { fetchPublishedSeminars, type Seminar } from "@/lib/api";
import { getServerT } from "@/lib/i18n/server";

const DEFAULT_TITLE = "Upcoming seminars";
const DEFAULT_BODY_1 =
  "CAISBE delivers the practical knowledge and industry insight professionals need to excel in workplace and facilities management";
const DEFAULT_BODY_2 =
  "Advance your career with expert training from CAISBE, a trusted provider of professional development for built environment professionals and employers.";

function isUpcoming(seminar: Seminar, nowMs: number): boolean {
  if (!seminar.event_starts_at) return true;
  const starts = Date.parse(seminar.event_starts_at);
  if (Number.isNaN(starts)) return true;
  return starts >= nowMs;
}

function upcomingSeminars(items: Seminar[], limit = 6): Seminar[] {
  const nowMs = Date.now();
  return items
    .filter((item) => isUpcoming(item, nowMs))
    .sort((a, b) => {
      const aTime = a.event_starts_at ? Date.parse(a.event_starts_at) : Number.POSITIVE_INFINITY;
      const bTime = b.event_starts_at ? Date.parse(b.event_starts_at) : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return a.sort_order - b.sort_order || a.id - b.id;
    })
    .slice(0, limit);
}

export default async function SeminarsSection({
  title,
  body1,
  body2,
  cta,
  emptyMessage = "Upcoming seminars will appear here once published by CAISBE.",
}: {
  title?: string;
  body1?: string;
  body2?: string;
  cta?: string;
  emptyMessage?: string;
}) {
  const { t } = await getServerT();
  const heading = title ?? DEFAULT_TITLE;
  const paragraph1 = body1 ?? DEFAULT_BODY_1;
  const paragraph2 = body2 ?? DEFAULT_BODY_2;
  const linkLabel =
    cta || t("Find out more about our seminars", "En savoir plus sur nos séminaires");
  const badgeLabel = t("Seminar", "Séminaire");

  let seminars: Seminar[] = [];
  try {
    seminars = upcomingSeminars(await fetchPublishedSeminars());
  } catch {
    seminars = [];
  }

  return (
    <section className={`bg-[#f7f9fa] ${sectionSpacingClassName}`}>
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-caisbe-muted md:text-lg">{paragraph1}</p>
          <p className="mt-3 text-base leading-7 text-caisbe-muted md:text-lg">{paragraph2}</p>
          <Link
            href="/professional-development"
            className="mt-5 inline-flex items-center gap-1 text-base font-bold text-caisbe-red transition hover:text-caisbe-red-dark"
          >
            {linkLabel}
            <span aria-hidden className="text-lg leading-none">
              ›
            </span>
          </Link>
        </div>

        {seminars.length === 0 ? (
          <p className="text-center text-base leading-7 text-caisbe-muted">{emptyMessage}</p>
        ) : (
          <HorizontalCarousel
            label={heading}
            itemClassName="w-[min(92vw,40rem)] shrink-0 snap-start sm:w-[min(85vw,42rem)] lg:w-[40rem]"
          >
            {seminars.map((seminar) => {
              const coverUrl = seminar.cover_url?.trim() || null;
              return (
                <Link
                  key={seminar.id}
                  href={`/professional-development/seminars/${seminar.id}/register`}
                  className={`group relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-none shadow-hopewell transition duration-300 hover:-translate-y-1 sm:min-h-[26rem] ${
                    coverUrl
                      ? "bg-caisbe-text-dark"
                      : "bg-gradient-to-br from-[#3d3832] via-[#5c1a2e] to-[#7b1e3a]"
                  }`}
                >
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/10"
                    aria-hidden
                  />
                  <div className="relative flex h-full min-w-0 flex-col px-6 pb-6 pt-7 text-left text-white sm:px-8 sm:pb-8 sm:pt-9">
                    <div className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 sm:text-sm">
                      {seminar.event_date_label ? (
                        <p className="line-clamp-2 break-words">{seminar.event_date_label}</p>
                      ) : null}
                      {seminar.event_format_label ? (
                        <p className="line-clamp-2 break-words">{seminar.event_format_label}</p>
                      ) : null}
                    </div>
                    <h3 className="mt-auto pt-12 font-hopewell-display text-2xl font-bold leading-snug break-words sm:text-3xl">
                      {seminar.title}
                    </h3>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/85 sm:text-sm">
                      {badgeLabel}
                    </p>
                  </div>
                </Link>
              );
            })}
          </HorizontalCarousel>
        )}
      </div>
    </section>
  );
}
