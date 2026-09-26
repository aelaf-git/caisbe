import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { fetchPublishedNewsBySlug } from "@/lib/api";
import { formatNewsDate } from "@/lib/data/news";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await fetchPublishedNewsBySlug(slug);
    return {
      title: `${post.title} | CAISBE News`,
      description: post.short_description ?? post.title,
    };
  } catch {
    return { title: "News | CAISBE" };
  }
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let post;
  try {
    post = await fetchPublishedNewsBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <PageHero
        eyebrow="News & Announcements"
        title={post.title}
        lead={post.short_description ?? undefined}
        actions={
          <>
            <ButtonLink href="/news" variant="primary">
              All News
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Contact Us
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-sm font-semibold text-caisbe-muted">
          {formatNewsDate(post.posted_on)}
          {post.tag ? ` · ${post.tag}` : ""}
        </p>
      </PageHero>

      {post.cover_url ? (
        <div className="mx-auto max-w-7xl px-4 pb-0 pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_url}
            alt=""
            className="aspect-[21/9] w-full object-cover"
          />
        </div>
      ) : null}

      {post.long_description ? (
        <ContentSection title="Announcement" wide>
          <div className="max-w-3xl whitespace-pre-wrap text-base leading-7 text-caisbe-text">
            {post.long_description}
          </div>
        </ContentSection>
      ) : null}

      {post.image_urls?.length ? (
        <ContentSection title="Gallery" wide>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {post.image_urls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            ))}
          </div>
        </ContentSection>
      ) : null}

      {post.video_urls?.length ? (
        <ContentSection title="Videos" wide>
          <div className="grid gap-6 md:grid-cols-2">
            {post.video_urls.map((url) => (
              <video
                key={url}
                controls
                preload="metadata"
                className="aspect-video w-full bg-black"
                src={url}
              >
                <a href={url}>Download video</a>
              </video>
            ))}
          </div>
        </ContentSection>
      ) : null}
    </>
  );
}
