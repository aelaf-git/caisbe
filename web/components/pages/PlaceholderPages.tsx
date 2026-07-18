import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero, SubsectionIndex } from "@/components/pages/ContentPage";
import type { PlaceholderPage } from "@/lib/data/site-pages";

export function PlaceholderIndexContent({
  eyebrow,
  title,
  description,
  items,
  basePath,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: PlaceholderPage[];
  basePath: string;
}) {
  return (
    <SubsectionIndex
      eyebrow={eyebrow}
      title={title}
      description={description}
      items={items.map((item) => ({
        title: item.title,
        description: item.description,
        href: `${basePath}/${item.slug}`,
      }))}
    />
  );
}

export function PlaceholderSubpageContent({
  eyebrow,
  page,
  indexHref,
  indexLabel,
}: {
  eyebrow: string;
  page: PlaceholderPage;
  indexHref: string;
  indexLabel: string;
}) {
  return (
    <PageHero
      eyebrow={eyebrow}
      title={page.title}
      actions={
        <>
          <ButtonLink href="/contact" variant="primary">
            Contact Us
          </ButtonLink>
          <ButtonLink href={indexHref} variant="secondary">
            {indexLabel}
          </ButtonLink>
        </>
      }
    >
      <p className="mt-6 text-base leading-7 text-caisbe-muted">
        {page.description}
      </p>
      <p className="mt-4 text-base leading-7 text-caisbe-muted">
        More detailed content for this page is coming soon.
      </p>
    </PageHero>
  );
}
