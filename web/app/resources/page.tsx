import type { Metadata } from "next";
import {
  ContentCard,
  ContentSection,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import { advocacyContent, membersCornerContent } from "@/lib/data/resources";
import { resourcesPages } from "@/lib/data/site-pages";

export const metadata: Metadata = {
  title: "Resources | CAISBE",
  description:
    "Explore CAISBE resources including careers, advocacy, knowledge tools, and Members Corner.",
};

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
    title: membersCornerContent.title,
    description: membersCornerContent.description,
    href: "/resources/members-corner",
  },
];

export default function ResourcesPage() {
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
              meta={item.slug === "fm-resources" ? "Coming soon" : undefined}
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
