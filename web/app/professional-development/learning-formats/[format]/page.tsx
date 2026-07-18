import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LearningFormatPageContent from "@/components/professional-development/LearningFormatPageContent";
import {
  getLearningFormatBySlug,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";

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
  const format = getLearningFormatBySlug(formatSlug);

  if (!format) {
    notFound();
  }

  return (
    <LearningFormatPageContent
      title={format.title}
      description={format.description}
    />
  );
}
