import type { Metadata } from "next";
import HelpDeskPageContent from "@/components/resources/HelpDeskPageContent";
import { helpDeskContent } from "@/lib/data/helpDesk";
import { cmsTopicMetadata } from "@/lib/cmsTopic";
import { fetchPublishedSitePage } from "@/lib/sitePages";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/resources/help-desk", helpDeskContent.metaDescription)) ?? {
      title: helpDeskContent.seoTitle,
      description: helpDeskContent.metaDescription,
    }
  );
}

export default async function HelpDeskPage() {
  const page = await fetchPublishedSitePage("/resources/help-desk");
  const faqs = page
    ? page.sections
        .map((section) => ({
          question: section.title,
          answer: (section.items?.filter(Boolean).length
            ? section.items.filter((line): line is string => Boolean(line))
            : section.body
              ? [section.body]
              : []),
        }))
        .filter((faq) => faq.question.trim() && faq.answer.length > 0)
    : undefined;

  return (
    <HelpDeskPageContent
      title={page?.title}
      lead={page?.lead}
      ctaLabel={page?.ctaLabel}
      ctaHref={page?.ctaHref}
      faqs={faqs}
    />
  );
}
