import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LearningFormatPageContent from "@/components/professional-development/LearningFormatPageContent";
import {
  getLearningFormatBySlug,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

type LearningFormatPageProps = {
  params: Promise<{ format: string }>;
};

export function generateStaticParams() {
  return professionalDevelopmentContent.formats.items.map((format) => ({
    format: format.slug,
  }));
}

export async function generateMetadata({
  params,
}: LearningFormatPageProps): Promise<Metadata> {
  const { format: formatSlug } = await params;
  const published = await cmsTopicMetadata(
    `/professional-development/learning-formats/${formatSlug}`,
    "Learning Format | CAISBE",
  );
  if (published) return published;

  const format = getLearningFormatBySlug(formatSlug);
  if (!format) {
    return { title: "Learning Format | CAISBE" };
  }

  return {
    title: `${format.title} | CAISBE`,
    description: format.description,
  };
}

export default async function LearningFormatPage({
  params,
}: LearningFormatPageProps) {
  const { format: formatSlug } = await params;
  const cms = await cmsTopicPage(
    `/professional-development/learning-formats/${formatSlug}`,
  );
  if (cms) return cms;

  const format = getLearningFormatBySlug(formatSlug);
  if (!format) {
    notFound();
  }

  return <LearningFormatPageContent format={format} />;
}
