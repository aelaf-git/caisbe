import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  FeatureList,
  PageHero,
  heroNoteClassName,
} from "@/components/pages/ContentPage";
import type { TopicPage } from "@/lib/data/site-pages";
import { translateLabel } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

type TopicPageContentProps = {
  eyebrow: string;
  page: TopicPage;
  indexHref: string;
  indexLabel: string;
};

export default async function TopicPageContent({
  eyebrow,
  page,
  indexHref,
  indexLabel,
}: TopicPageContentProps) {
  const locale = await getServerLocale();
  return (
    <>
      <PageHero
        eyebrow={translateLabel(eyebrow, locale)}
        title={page.title}
        lead={page.lead}
        backHref={indexHref}
        backLabel={translateLabel(indexLabel, locale)}
        actions={
          page.ctaLabel && page.ctaHref ? (
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
          ) : undefined
        }
      >
        {page.description ? (
          <p className={heroNoteClassName}>{page.description}</p>
        ) : null}
      </PageHero>

      {page.sections.map((section) => (
        <ContentSection key={section.title} title={section.title}>
          {section.body ? (
            <p className="text-base leading-7 text-caisbe-text sm:text-lg sm:leading-8">
              {section.body}
            </p>
          ) : null}
          {section.items?.length ? (
            <div className={section.body ? "mt-6" : undefined}>
              <FeatureList items={section.items} />
            </div>
          ) : null}
          {page.slug === "board-of-directors" && section === page.sections[page.sections.length - 1] ? (
            <div className="mt-6">
              <ButtonLink href="/contact" variant="primary">
                {locale === "fr" ? "Nous joindre" : "Contact us"}
              </ButtonLink>
            </div>
          ) : null}
        </ContentSection>
      ))}
    </>
  );
}
