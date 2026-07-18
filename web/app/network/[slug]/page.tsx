import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NetworkSubpageContent } from "@/components/network/NetworkPageContent";
import {
  getNetworkPage,
  networkSlugs,
  type NetworkSlug,
} from "@/lib/data/network";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return networkSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getNetworkPage(slug);
  if (!page) return { title: "Network | CAISBE" };
  return {
    title: `${page.title} | CAISBE`,
    description: page.description,
  };
}

export default async function NetworkSubpage({ params }: Props) {
  const { slug } = await params;
  const page = getNetworkPage(slug);
  if (!page) notFound();

  return <NetworkSubpageContent slug={slug as NetworkSlug} />;
}
