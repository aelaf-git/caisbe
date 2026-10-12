import Link from "next/link";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { fetchPublishedNews, type NewsPost } from "@/lib/api";
import { formatNewsDate, newsContent } from "@/lib/data/news";
import { fetchPublishedSitePage } from "@/lib/sitePages";

export default async function NewsPageContent() {
  const { eyebrow, title, lead, intro } = newsContent;
  const page = await fetchPublishedSitePage("/news");
  const updates = page?.sections?.[0];

  let posts: NewsPost[] = [];
  try {
    posts = await fetchPublishedNews();
  } catch {
    posts = [];
  }

  const hasPosts = posts.length > 0;

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={page?.title?.trim() || title}
        lead={page?.lead?.trim() || lead}
        actions={
          hasPosts ? (
            <>
              <ButtonLink href={page?.ctaHref || "/contact"} variant="primary">
                {page?.ctaLabel?.trim() || "Media Inquiries"}
              </ButtonLink>
              <ButtonLink href="/events" variant="secondary">
                Upcoming Events
              </ButtonLink>
            </>
          ) : undefined
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {page?.description?.trim() || intro}
        </p>
      </PageHero>

      <ContentSection
        title={updates?.title?.trim() || "Latest updates"}
        description={
          updates?.body?.trim() ||
          "Announcements are listed newest first as published by the CAISBE team."
        }
        wide
      >
        {!hasPosts ? (
          <div className="rounded-lg border border-dashed border-ifma-border bg-[#fafafa] px-6 py-12 text-center">
            <p className="text-base leading-7 text-caisbe-muted">
              No announcements yet. Check back soon for the latest institute
              updates.
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            {posts.map((post, index) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-[20px] bg-white shadow-hopewell"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="grid gap-0 md:grid-cols-[minmax(0,18rem)_1fr]">
                  {post.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_url}
                      alt=""
                      className="aspect-[4/3] h-full w-full object-cover md:aspect-auto md:min-h-[12rem]"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-[#fafaf8] md:aspect-auto md:min-h-[12rem]">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
                        News
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col p-6">
                    <p className="text-sm font-semibold text-caisbe-muted">
                      {formatNewsDate(post.posted_on)}
                      {post.tag ? ` · ${post.tag}` : ""}
                    </p>
                    <h3 className="mt-2 font-hopewell-display text-2xl font-bold tracking-tight text-caisbe-text-dark">
                      {post.title}
                    </h3>
                    {post.short_description ? (
                      <p className="mt-3 flex-1 text-base leading-7 text-caisbe-muted">
                        {post.short_description}
                      </p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    {post.external_url ? (
                      <a
                        href={post.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
                      >
                        Open article
                      </a>
                    ) : (
                      <Link
                        href={`/news/${post.slug}`}
                        className="mt-5 text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
                      >
                        Read more
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </ContentSection>
    </>
  );
}
