import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  FeatureList,
  PageHero,
  heroNoteClassName,
} from "@/components/pages/ContentPage";
import { advocacyContent } from "@/lib/data/resources";
import type { TopicPage, TopicSection } from "@/lib/data/site-pages";
import { translateLabel } from "@/lib/i18n";
import { FR_SITE_PAGES } from "@/lib/i18n/content/sitePages.fr";
import { getServerLocale, getServerT } from "@/lib/i18n/server";
import { topicChrome } from "@/lib/sitePages";

const CONSULTANCY_TITLES = new Set([
  "strategic consultancy",
  "conseil stratégique",
]);

const MINOR_SERVICE_TITLES = new Set([
  "policy advisory & consultation",
  "knowledge exchange & partnerships",
  "green growth & sustainability support",
  "conseil et consultation en politiques",
  "échange de connaissances et partenariats",
  "croissance verte et soutien à la durabilité",
]);

const minorHeadingClassName =
  "font-hopewell-display text-xl font-bold text-caisbe-text-dark md:text-2xl";

const bodyClassName = "text-base leading-7 text-caisbe-text sm:text-lg sm:leading-8";

type ConsultancyService = {
  title: string;
  body?: string;
  items?: string[];
};

type FoldedSection = TopicSection & {
  services?: ConsultancyService[];
};

function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

function foldConsultancyServices(sections: TopicSection[]): FoldedSection[] {
  const hasConsultancy = sections.some((section) =>
    CONSULTANCY_TITLES.has(normalizeTitle(section.title)),
  );
  if (!hasConsultancy) return sections;

  const services = sections
    .filter((section) => MINOR_SERVICE_TITLES.has(normalizeTitle(section.title)))
    .map((section) => ({
      title: section.title,
      body: section.body,
      items: section.items,
    }));

  return sections.flatMap((section) => {
    if (MINOR_SERVICE_TITLES.has(normalizeTitle(section.title))) return [];
    if (!CONSULTANCY_TITLES.has(normalizeTitle(section.title))) return [section];
    return [{ ...section, services }];
  });
}

function MinorHeadings({ services }: { services: ConsultancyService[] }) {
  return (
    <div className="max-w-3xl space-y-8">
      {services.map((service) => (
        <div key={service.title}>
          <h3 className={minorHeadingClassName}>{service.title}</h3>
          {service.body ? <p className={`mt-3 ${bodyClassName}`}>{service.body}</p> : null}
          {service.items?.length ? (
            <div className="mt-4">
              <FeatureList items={service.items} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

async function AdvocacyTopicPage({ page }: { page: TopicPage }) {
  const locale = await getServerLocale();
  const chrome = topicChrome("/resources/advocacy-government-affairs");
  const sections = foldConsultancyServices(page.sections);

  return (
    <>
      <PageHero
        eyebrow={translateLabel(chrome.eyebrow, locale)}
        title={page.title}
        lead={page.lead}
        backHref={chrome.indexHref}
        backLabel={translateLabel(chrome.indexLabel, locale)}
        actions={
          page.ctaLabel && page.ctaHref ? (
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
          ) : undefined
        }
      >
        {page.description ? <p className={heroNoteClassName}>{page.description}</p> : null}
      </PageHero>

      {sections.map((section) => (
        <ContentSection key={section.title} title={section.title}>
          {section.body ? <p className={bodyClassName}>{section.body}</p> : null}
          {section.items?.length ? (
            <div className={section.body ? "mt-6" : undefined}>
              <FeatureList items={section.items} />
            </div>
          ) : null}
          {section.services?.length ? (
            <div className={section.body || section.items?.length ? "mt-8" : undefined}>
              <MinorHeadings services={section.services} />
            </div>
          ) : null}
        </ContentSection>
      ))}
    </>
  );
}

export default async function AdvocacyPageContent({
  page = null,
}: {
  page?: TopicPage | null;
}) {
  const { t, locale } = await getServerT();
  const frPage = FR_SITE_PAGES["/resources/advocacy-government-affairs"];
  const topicPage = page ?? (locale === "fr" ? frPage : null);
  if (topicPage) return <AdvocacyTopicPage page={topicPage} />;

  const [lead, ...bodyParagraphs] = advocacyContent.paragraphs;
  const minorServices = advocacyContent.services.filter((service) =>
    MINOR_SERVICE_TITLES.has(normalizeTitle(service.title)),
  );
  const capacity = advocacyContent.services.find(
    (service) => !MINOR_SERVICE_TITLES.has(normalizeTitle(service.title)),
  );

  return (
    <>
      <PageHero
        eyebrow={t("Resources", "Ressources")}
        title={advocacyContent.title}
        lead={lead}
        actions={
          <ButtonLink href="/contact" variant="primary">
            {t("Contact Us", "Nous joindre")}
          </ButtonLink>
        }
      />

      <ContentSection>
        <div className="max-w-3xl space-y-6">
          {bodyParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="text-base leading-8 text-caisbe-text md:text-lg">
              {paragraph}
            </p>
          ))}
        </div>
      </ContentSection>

      <ContentSection
        title={t("Strategic consultancy", "Conseil stratégique")}
        description={advocacyContent.servicesIntro}
      >
        <MinorHeadings
          services={minorServices.map((service) => ({
            title: service.title,
            body: service.description,
          }))}
        />
      </ContentSection>

      {capacity ? (
        <ContentSection title={capacity.title} description={capacity.description} />
      ) : null}

      <ContentSection>
        <p className="max-w-3xl text-base leading-8 text-caisbe-text md:text-lg">
          {advocacyContent.closing}
        </p>
        <div className="mt-8">
          <ButtonLink href="/contact" variant="primary">
            {t("Contact Us", "Nous joindre")}
          </ButtonLink>
        </div>
      </ContentSection>
    </>
  );
}
