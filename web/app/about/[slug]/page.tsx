import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuiltEnvironmentPageContent from "@/components/about/BuiltEnvironmentPageContent";
import TopicPageContent from "@/components/pages/TopicPageContent";
import { aboutContent } from "@/lib/data/about";
import { aboutPages, getAboutPage } from "@/lib/data/site-pages";
import { fetchPublishedSitePage, topicChrome } from "@/lib/sitePages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return aboutPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const published = await fetchPublishedSitePage(`/about/${slug}`);
  if (published) {
    return {
      title: `${published.title} | CAISBE`,
      description: published.description,
    };
  }

  if (slug === aboutContent.builtEnvironment.slug) {
    return {
      title: aboutContent.builtEnvironment.seoTitle,
      description: aboutContent.builtEnvironment.metaDescription,
    };
  }

  const page = getAboutPage(slug);
  if (!page) return { title: "About CAISBE" };
  return {
    title: `${page.title} | CAISBE`,
    description: page.description,
  };
}

export default async function AboutSubpage({ params }: Props) {
  const { slug } = await params;

  const published = await fetchPublishedSitePage(`/about/${slug}`);
  if (published) {
    const chrome = topicChrome(`/about/${slug}`);
    return (
      <TopicPageContent
        eyebrow={chrome.eyebrow}
        page={published}
        indexHref={chrome.indexHref}
        indexLabel={chrome.indexLabel}
      />
    );
  }

  if (slug === aboutContent.builtEnvironment.slug) {
    return <BuiltEnvironmentPageContent />;
  }

  const page = getAboutPage(slug);
  if (!page) notFound();

  return (
    <TopicPageContent
      eyebrow="About CAISBE"
      page={page}
      indexHref="/about"
      indexLabel="About Overview"
    />
  );
}
