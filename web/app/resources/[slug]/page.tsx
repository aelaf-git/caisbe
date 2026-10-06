import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdvocacyPageContent from "@/components/resources/AdvocacyPageContent";
import MagazinePageContent from "@/components/resources/MagazinePageContent";
import MediaChannelPageContent from "@/components/resources/MediaChannelPageContent";
import { MediaItemContent } from "@/components/resources/MembersCornerContent";
import TopicPageContent from "@/components/pages/TopicPageContent";
import {
  advocacyContent,
  getMediaItem,
  mediaSlugs,
} from "@/lib/data/resources";
import { getResourcePage, resourcesPages } from "@/lib/data/site-pages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const slugs = new Set([
    ...resourcesPages.map((page) => page.slug),
    ...mediaSlugs,
    advocacyContent.slug,
  ]);
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (slug === advocacyContent.slug) {
    return {
      title: advocacyContent.seoTitle,
      description: advocacyContent.metaDescription,
    };
  }

  const mediaItem = getMediaItem(slug);
  if (mediaItem) {
    return {
      title: `${mediaItem.title} | CAISBE`,
      description: mediaItem.description,
    };
  }

  const page = getResourcePage(slug);
  if (!page) return { title: "Resources | CAISBE" };
  return {
    title: `${page.title} | CAISBE`,
    description: page.description,
  };
}

export default async function ResourceSubpage({ params }: Props) {
  const { slug } = await params;

  if (slug === advocacyContent.slug) {
    return <AdvocacyPageContent />;
  }

  if (slug === "magazine") {
    return <MagazinePageContent />;
  }

  if (slug === "youtube" || slug === "podcast" || slug === "blog") {
    return <MediaChannelPageContent channel={slug} />;
  }

  if (mediaSlugs.includes(slug)) {
    return <MediaItemContent slug={slug} />;
  }

  const page = getResourcePage(slug);
  if (!page) notFound();

  return (
    <TopicPageContent
      eyebrow="Resources"
      page={page}
      indexHref="/resources"
      indexLabel="All Resources"
    />
  );
}
