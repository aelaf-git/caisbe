import type { Metadata } from "next";
import ButtonLink from "@/components/ui/ButtonLink";
import { SubsectionIndex } from "@/components/pages/ContentPage";
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

      <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="brand-section-title text-3xl font-semibold">
              More Resources
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {resourcesPages.map((item) => (
              <article
                key={item.slug}
                className="brand-card-shadow flex flex-col rounded-lg border border-ifma-border-light bg-white p-6"
              >
                <h3 className="text-xl font-semibold text-caisbe-green">
                  {item.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-caisbe-muted">
                  {item.description}
                </p>
                <ButtonLink
                  href={`/resources/${item.slug}`}
                  variant="text"
                  className="mt-6"
                >
                  Learn More
                </ButtonLink>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
