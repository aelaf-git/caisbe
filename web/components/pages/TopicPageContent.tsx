import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import type { TopicPage } from "@/lib/data/site-pages";

type TopicPageContentProps = {
  eyebrow: string;
  page: TopicPage;
  indexHref: string;
  indexLabel: string;
};

export default function TopicPageContent({
  eyebrow,
  page,
  indexHref,
  indexLabel,
}: TopicPageContentProps) {
  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={page.title}
        lead={page.lead}
        backHref={indexHref}
        backLabel={indexLabel}
        actions={
          page.ctaLabel && page.ctaHref ? (
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
          ) : undefined
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {page.description}
        </p>
      </PageHero>

      {page.sections.map((section) => (
        <ContentSection key={section.title} title={section.title}>
          {section.body ? (
            <p className="text-base leading-7 text-caisbe-muted">{section.body}</p>
          ) : null}
          {section.items?.length ? (
            <ul
              className={`grid gap-3 sm:grid-cols-2 ${section.body ? "mt-6" : ""}`}
            >
              {section.items.map((item) => (
                <li
                  key={item}
                  className="rounded-[20px] bg-white px-4 py-3 text-sm font-medium text-caisbe-text shadow-hopewell"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </ContentSection>
      ))}
    </>
  );
}
