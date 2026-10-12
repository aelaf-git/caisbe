import type { Metadata } from "next";
import {
  ContentCard,
  ContentSection,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import { helpDeskContent } from "@/lib/data/helpDesk";
import { advocacyContent, mediaContent } from "@/lib/data/resources";
import { resourcesPages } from "@/lib/data/site-pages";
import { ticketsContent } from "@/lib/data/tickets";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

const fallbackDescription =
  "Explore CAISBE resources including careers, advocacy, knowledge tools, and media.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/resources", fallbackDescription)) ?? {
      title: "Resources | CAISBE",
      description: fallbackDescription,
    }
  );
}

const featuredResources = [
  {
    title: "Careers & Job Board",
    description:
      "Explore facility management jobs, internships, and career development resources.",
    href: "/careers",
  },
  {
    title: advocacyContent.title,
    description:
      "Policy dialogue, Africa–Canada collaboration, and strategic consultancy for sustainable built environments.",
    href: `/resources/${advocacyContent.slug}`,
  },
  {
    title: helpDeskContent.title,
    description: "How can we help? Search FAQs about courses, exams, membership, and more.",
    href: `/resources/${helpDeskContent.slug}`,
  },
  {
    title: ticketsContent.title,
    description: ticketsContent.lead,
    href: `/resources/${ticketsContent.slug}`,
  },
  {
    title: mediaContent.title,
    description: mediaContent.description,
    href: "/resources/media",
  },
];

export default async function ResourcesPage() {
  const cms = await cmsTopicPage("/resources");
  if (cms) return cms;

  return (
    <>
      <SubsectionIndex
        eyebrow="Resources"
        title="Resources"
        description="Tools, careers, advocacy, and member media for the CAISBE community."
        items={featuredResources}
      />

      <ContentSection title="More Resources" wide>
        <div className="grid gap-6 md:grid-cols-2">
          {resourcesPages.map((item, index) => (
            <ContentCard
              key={item.slug}
              title={item.title}
              description={item.description}
              href={`/resources/${item.slug}`}
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
        </div>
      </ContentSection>
    </>
  );
}
