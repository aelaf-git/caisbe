import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ButtonLink from "@/components/ui/ButtonLink";
import AdvocacyPageContent from "@/components/resources/AdvocacyPageContent";
import MagazinePageContent from "@/components/resources/MagazinePageContent";
import { MembersCornerItemContent } from "@/components/resources/MembersCornerContent";
import { PageHero } from "@/components/pages/ContentPage";
import TopicPageContent from "@/components/pages/TopicPageContent";
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

  if (slug === "magazine") {
    return <MagazinePageContent />;
  }

  if (membersCornerSlugs.includes(slug)) {
    return <MembersCornerItemContent slug={slug} />;
  }

  const page = getResourcePage(slug);
  if (!page) notFound();

  if (slug === "fm-resources") {
    return (
      <PageHero
        eyebrow="Coming Soon"
        title={page.title}
        lead={page.lead}
        actions={
          <>
            <ButtonLink href="/resources" variant="secondary">
              All Resources
            </ButtonLink>
            <ButtonLink href="/contact" variant="primary">
              Contact Us
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {page.description}
        </p>
        <p className="mt-4 text-base leading-7 text-caisbe-muted">
          This placeholder will become a single hub for facility management
          resources. Content is being prepared—thank you for your patience.
        </p>
      </PageHero>
    );
  }

  return (
    <TopicPageContent
      eyebrow="Resources"
      page={page}
      indexHref="/resources"
      indexLabel="All Resources"
    />
  );
}
