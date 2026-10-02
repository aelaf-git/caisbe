import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { advocacyContent } from "@/lib/data/resources";

export default function AdvocacyPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title={advocacyContent.title}
        lead={advocacyContent.paragraphs[0]}
        actions={
          <ButtonLink href="/contact" variant="primary">
            Contact Us
          </ButtonLink>
        }
      >
        {advocacyContent.paragraphs.slice(1).map((paragraph) => (
          <p
            key={paragraph.slice(0, 48)}
            className="mt-6 text-base leading-7 text-caisbe-muted"
          >
            {paragraph}
          </p>
        ))}
      </PageHero>

      <ContentSection
        title="Strategic consultancy"
        description={advocacyContent.servicesIntro}
        wide
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
        <p className="mt-8 max-w-3xl text-base leading-7 text-caisbe-muted">
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
