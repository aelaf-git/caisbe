import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero, SubsectionIndex } from "@/components/pages/ContentPage";
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
  if (slug === "overview") {
    const page = networkPages.overview;
    return (
      <PageHero eyebrow="Network" title={page.title}>
        {page.paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 40)}
            className="mt-6 text-base leading-7 text-caisbe-muted"
          >
            {paragraph}
          </p>
        ))}
        <div className="mt-10">
          <ButtonLink href="/network/discussion-forum" variant="primary">
            Discussion Forum
          </ButtonLink>
        </div>
      </PageHero>
    );
  }

  const page = networkPages["discussion-forum"];
  return (
    <PageHero
      eyebrow="Network"
      title={page.title}
      actions={
        <ButtonLink href={page.ctaHref} variant="primary">
          {page.ctaLabel}
        </ButtonLink>
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
  );
}
