import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { advocacyContent } from "@/lib/data/resources";

export default function AdvocacyPageContent() {
  const [lead, ...bodyParagraphs] = advocacyContent.paragraphs;

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title={advocacyContent.title}
        lead={lead}
        actions={
          <ButtonLink href="/contact" variant="primary">
            Contact Us
          </ButtonLink>
        }
      />

      <ContentSection className="!py-20 md:!py-24">
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
        title="Strategic consultancy"
        description={advocacyContent.servicesIntro}
        className="!py-20 md:!py-24 bg-[#fafafa]"
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
            Contact Us
          </ButtonLink>
        </div>
      </ContentSection>
    </>
  );
}
