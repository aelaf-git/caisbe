import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero, SubsectionIndex } from "@/components/pages/ContentPage";
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
    <PageHero
      eyebrow="Members Corner"
      title={item.title}
      actions={
        <>
          <ButtonLink href="/resources/members-corner" variant="secondary">
            Members Corner
          </ButtonLink>
          <ButtonLink href="/contact" variant="primary">
            Contact Us
          </ButtonLink>
        </>
      }
    >
      <p className="mt-6 text-base leading-7 text-caisbe-muted">
        {item.description}
      </p>
    </PageHero>
  );
}
