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
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  const fallbackDescription = t(
    "Explore CAISBE resources including careers, advocacy, knowledge tools, and media.",
    "Explorez les ressources du CAISBE, y compris les carrières, le plaidoyer, les outils de connaissances et les médias.",
  );
  return (
    (await cmsTopicMetadata("/resources", fallbackDescription)) ?? {
      title: t("Resources | CAISBE", "Ressources | CAISBE"),
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
    title: "Forms and Guides",
    description:
      "Download CAISBE forms, templates, and practical guides for members and facility professionals.",
    href: "/resources/forms-and-guides",
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

  const { t } = await getServerT();
  return (
    <>
      <SubsectionIndex
        eyebrow={t("Resources", "Ressources")}
        title={t("Resources", "Ressources")}
        description={t(
          "Tools, careers, advocacy, and member media for the CAISBE community.",
          "Outils, carrières, plaidoyer et médias pour les membres de la communauté du CAISBE.",
        )}
        items={featuredResources}
      />

      <ContentSection title={t("More Resources", "Plus de ressources")} wide>
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
