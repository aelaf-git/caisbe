import ButtonLink from "@/components/ui/ButtonLink";
import { fetchPublishedMagazines, type MediaAsset } from "@/lib/api";

export default async function MagazineSection() {
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
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
              CAISBE Magazine
            </h2>
            <p className="mt-2 text-base text-caisbe-muted">
              Read the latest features and insights from across the CAISBE community.
            </p>
          </div>
          <ButtonLink href="/resources/magazine" variant="text">
            View all issues
          </ButtonLink>
        </div>

        {issues.length === 0 ? (
          <p className="text-base text-caisbe-muted">
            New magazine issues will appear here once published by the CAISBE team.
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
                      Magazine
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
                  <a
                    href={issue.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 text-base font-bold text-caisbe-red hover:underline"
                  >
                    Read issue
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
