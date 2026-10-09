import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MembershipSubpageContent } from "@/components/membership/MembershipPageContent";
import {
  getMembershipPage,
  membershipSlugs,
  type MembershipSlug,
} from "@/lib/data/membership";
import TopicPageContent from "@/components/pages/TopicPageContent";
import { fetchPublishedSitePage, topicChrome } from "@/lib/sitePages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return membershipSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getMembershipPage(slug);
  if (page) {
    return {
      title: `${page.title} | CAISBE`,
      description: page.title,
    };
  }

  const published = await fetchPublishedSitePage(`/membership/${slug}`);
  if (published) {
    return {
      title: `${published.title} | CAISBE`,
      description: published.description,
    };
  }
  return { title: "Membership | CAISBE" };
}

export default async function MembershipSubpage({ params }: Props) {
  const { slug } = await params;
  const page = getMembershipPage(slug);
  if (page) return <MembershipSubpageContent slug={slug as MembershipSlug} />;

  const published = await fetchPublishedSitePage(`/membership/${slug}`);
  if (!published) notFound();
  const chrome = topicChrome(`/membership/${slug}`);
  return (
    <TopicPageContent
      eyebrow={chrome.eyebrow}
      page={published}
      indexHref={chrome.indexHref}
      indexLabel={chrome.indexLabel}
    />
  );
}
