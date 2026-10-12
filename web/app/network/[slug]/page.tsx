import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NetworkSubpageContent } from "@/components/network/NetworkPageContent";
import {
  getNetworkPage,
  networkSlugs,
  type NetworkSlug,
} from "@/lib/data/network";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

type Props = { params: Promise<{ slug: string }> };

/** Discussion forum keeps its interactive boards. */
const SPECIAL_NETWORK_SLUGS = new Set(["discussion-forum"]);

export function generateStaticParams() {
  return networkSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SPECIAL_NETWORK_SLUGS.has(slug)) {
    const published = await cmsTopicMetadata(`/network/${slug}`, "Network | CAISBE");
    if (published) return published;
  }

  const page = getNetworkPage(slug);
  if (page) {
    return {
      title: `${page.title} | CAISBE`,
      description: page.description,
    };
  }

  const published = await cmsTopicMetadata(`/network/${slug}`, "Network | CAISBE");
  if (published) return published;
  return { title: "Network | CAISBE" };
}

export default async function NetworkSubpage({ params }: Props) {
  const { slug } = await params;

  if (!SPECIAL_NETWORK_SLUGS.has(slug)) {
    const cms = await cmsTopicPage(`/network/${slug}`);
    if (cms) return cms;
  }

  const page = getNetworkPage(slug);
  if (page) return <NetworkSubpageContent slug={slug as NetworkSlug} />;

  const cms = await cmsTopicPage(`/network/${slug}`);
  if (!cms) notFound();
  return cms;
}
