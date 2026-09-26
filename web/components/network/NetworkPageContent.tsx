import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  PageHero,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import {
  networkIndexItems,
  networkPages,
  type NetworkSlug,
} from "@/lib/data/network";

export function NetworkIndexContent() {
  return (
    <SubsectionIndex
      eyebrow="Network"
      title="Network"
      description="Connect with CAISBE networking groups and join the African Facility Management Discussion Forum."
      items={networkIndexItems}
    />
  );
}

export function NetworkSubpageContent({ slug }: { slug: NetworkSlug }) {
  const page = networkPages[slug];

  return (
    <>
      <PageHero
        eyebrow="Network"
        title={page.title}
        lead={page.lead}
        actions={
          <>
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
            <ButtonLink href="/network" variant="secondary">
              Network Overview
            </ButtonLink>
          </>
        }
      >
        {page.paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 40)}
            className="mt-6 text-base leading-7 text-caisbe-muted"
          >
            {paragraph}
          </p>
        ))}
      </PageHero>
      <ContentSection title="Benefits of joining">
        <ul className="grid gap-3 sm:grid-cols-2">
          {page.benefits.map((benefit) => (
            <li
              key={benefit}
              className="shadow-brand-card rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-text"
            >
              {benefit}
            </li>
          ))}
        </ul>
      </ContentSection>
    </>
  );
}
