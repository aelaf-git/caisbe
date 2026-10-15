import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import TopicPageContent from "@/components/pages/TopicPageContent";
import { advocacyContent } from "@/lib/data/resources";
import { FR_SITE_PAGES } from "@/lib/i18n/content/sitePages.fr";
import { getServerT } from "@/lib/i18n/server";

export default async function AdvocacyPageContent() {
  const { t, locale } = await getServerT();
  const frPage = FR_SITE_PAGES["/resources/advocacy-government-affairs"];
  if (locale === "fr" && frPage) {
    return (
      <TopicPageContent
        eyebrow="Resources"
        page={frPage}
        indexHref="/resources"
        indexLabel="All Resources"
      />
    );
  }
  const [lead, ...bodyParagraphs] = advocacyContent.paragraphs;

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
            <p
              key={paragraph.slice(0, 48)}
              className="text-base leading-8 text-caisbe-text md:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </ContentSection>

      <ContentSection
        title={t("Strategic consultancy", "Conseil stratégique")}
        description={advocacyContent.servicesIntro}
        className="bg-[#fafafa]"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {advocacyContent.services.map((service, index) => (
            <ContentCard
              key={service.title}
              title={service.title}
              description={service.description}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-base leading-8 text-caisbe-text md:text-lg">
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
