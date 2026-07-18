import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdvocacyPageContent from "@/components/resources/AdvocacyPageContent";
import { MembersCornerItemContent } from "@/components/resources/MembersCornerContent";
import { PlaceholderSubpageContent } from "@/components/pages/PlaceholderPages";
import {
  advocacyContent,
  getMembersCornerItem,
  membersCornerSlugs,
} from "@/lib/data/resources";
import { getResourcePage, resourcesPages } from "@/lib/data/site-pages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const slugs = new Set([
    ...resourcesPages.map((page) => page.slug),
    ...membersCornerSlugs,
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

  const membersItem = getMembersCornerItem(slug);
  if (membersItem) {
    return {
      title: `${membersItem.title} | CAISBE`,
      description: membersItem.description,
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

  if (membersCornerSlugs.includes(slug)) {
    return <MembersCornerItemContent slug={slug} />;
  }

  const page = getResourcePage(slug);
  if (!page) notFound();

  return (
    <PlaceholderSubpageContent
      eyebrow="Resources"
      page={page}
      indexHref="/resources"
      indexLabel="All Resources"
    />
  );
}
