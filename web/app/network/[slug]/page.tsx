import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NetworkSubpageContent } from "@/components/network/NetworkPageContent";
import {
  getNetworkPage,
  networkSlugs,
  type NetworkSlug,
} from "@/lib/data/network";
import TopicPageContent from "@/components/pages/TopicPageContent";
import { fetchPublishedSitePage, topicChrome } from "@/lib/sitePages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return networkSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getNetworkPage(slug);
  if (page) {
    return {
      title: `${page.title} | CAISBE`,
      description: page.description,
    };
  }

  const published = await fetchPublishedSitePage(`/network/${slug}`);
  if (published) {
    return {
      title: `${published.title} | CAISBE`,
      description: published.description,
    };
  }
  return { title: "Network | CAISBE" };
}

export default async function NetworkSubpage({ params }: Props) {
  const { slug } = await params;
  const page = getNetworkPage(slug);
  if (page) return <NetworkSubpageContent slug={slug as NetworkSlug} />;

  const published = await fetchPublishedSitePage(`/network/${slug}`);
  if (!published) notFound();
  const chrome = topicChrome(`/network/${slug}`);
  return (
    <TopicPageContent
      eyebrow={chrome.eyebrow}
      page={published}
      indexHref={chrome.indexHref}
      indexLabel={chrome.indexLabel}
    />
  );
}
