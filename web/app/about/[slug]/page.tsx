import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuiltEnvironmentPageContent from "@/components/about/BuiltEnvironmentPageContent";
import { PlaceholderSubpageContent } from "@/components/pages/PlaceholderPages";
import { aboutContent } from "@/lib/data/about";
import { aboutPages, getAboutPage } from "@/lib/data/site-pages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return aboutPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

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

  if (slug === aboutContent.builtEnvironment.slug) {
    return <BuiltEnvironmentPageContent />;
  }

  const page = getAboutPage(slug);
  if (!page) notFound();

  return (
    <PlaceholderSubpageContent
      eyebrow="About CAISBE"
      page={page}
      indexHref="/about"
      indexLabel="About Overview"
    />
  );
}
