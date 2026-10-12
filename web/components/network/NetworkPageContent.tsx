import DiscussionForumHome from "@/components/network/DiscussionForumHome";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  FeatureList,
  PageHero,
  SubsectionIndex,
  heroNoteClassName,
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
          <p key={paragraph.slice(0, 40)} className={heroNoteClassName}>
            {paragraph}
          </p>
        ))}
      </PageHero>
      {slug === "discussion-forum" ? <DiscussionForumHome /> : null}
      {page.benefits.length > 0 ? (
        <ContentSection title="Benefits of joining">
          <FeatureList items={page.benefits} />
        </ContentSection>
      ) : null}
    </>
  );
}
