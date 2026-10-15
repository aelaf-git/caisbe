import { sectionSpacingClassName } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import { fetchPublishedMagazines, type MediaAsset } from "@/lib/api";

export default async function MagazineSection({
  title = "CAISBE Magazine",
  subtitle = "Read the latest features and insights from across the CAISBE community.",
  cta = "View all issues",
  emptyMessage = "New magazine issues will appear here once published by the CAISBE team.",
  readIssueLabel = "Read issue",
  badgeLabel = "Magazine",
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  emptyMessage?: string;
  readIssueLabel?: string;
  badgeLabel?: string;
}) {
  let issues: MediaAsset[] = [];
  try {
    let featured = await fetchPublishedMagazines({ featured: true });
    if (featured.length === 0) {
      featured = await fetchPublishedMagazines();
    }
    issues = featured.slice(0, 3);
  } catch {
    issues = [];
  }

  return (
    <section className={`bg-white ${sectionSpacingClassName}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
              {title}
            </h2>
            <p className="mt-2 text-base text-caisbe-muted">{subtitle}</p>
          </div>
          {cta ? (
            <ButtonLink href="/resources/magazine" variant="text">
              {cta}
            </ButtonLink>
          ) : null}
        </div>

        {issues.length === 0 ? (
          <p className="text-base text-caisbe-muted">
            {emptyMessage}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {issues.map((issue) => (
              <article
                key={issue.id}
                className="flex flex-col overflow-hidden rounded-[20px] bg-white shadow-hopewell transition duration-300 hover:-translate-y-1"
              >
                {issue.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={issue.cover_url}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-[#f7f9fa]">
                    <span className="text-base font-semibold text-caisbe-red">
                      {badgeLabel}
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-hopewell-display text-lg font-bold leading-snug text-caisbe-text-dark">
                    {issue.title}
                  </h3>
                  {issue.description ? (
                    <p className="mt-2 line-clamp-3 flex-1 text-base leading-7 text-caisbe-muted">
                      {issue.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {issue.file_url ? (
                    <a
                      href={issue.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 text-base font-bold text-caisbe-red hover:underline"
                    >
                      {readIssueLabel}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
