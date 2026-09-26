import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  PageHero,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import {
  getMembersCornerItem,
  membersCornerContent,
} from "@/lib/data/resources";

export function MembersCornerIndexContent() {
  return (
    <SubsectionIndex
      eyebrow="Resources"
      title={membersCornerContent.title}
      description={membersCornerContent.description}
      items={membersCornerContent.items.map((item) => ({
        title: item.title,
        description: item.description,
        href: `/resources/${item.slug}`,
      }))}
    />
  );
}

export function MembersCornerItemContent({ slug }: { slug: string }) {
  const item = getMembersCornerItem(slug);
  if (!item) return null;

  return (
    <>
      <PageHero
        eyebrow="Members Corner"
        title={item.title}
        lead={item.lead}
        actions={
          <>
            <ButtonLink href="/resources/members-corner" variant="secondary">
              Members Corner
            </ButtonLink>
            <ButtonLink href={item.ctaHref} variant="primary">
              {item.ctaLabel}
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {item.description}
        </p>
      </PageHero>
      <ContentSection title="What to expect">
        <ul className="grid gap-3 sm:grid-cols-2">
          {item.highlights.map((highlight) => (
            <li
              key={highlight}
              className="shadow-brand-card rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-text"
            >
              {highlight}
            </li>
          ))}
        </ul>
      </ContentSection>
    </>
  );
}
