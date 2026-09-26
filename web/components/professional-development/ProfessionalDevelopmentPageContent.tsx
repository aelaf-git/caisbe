import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import CpdActivitiesTable from "@/components/professional-development/CpdActivitiesTable";
import {
  certificatePath,
  learningFormatsPath,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";

export default function ProfessionalDevelopmentPageContent() {
  const { certificatesTitle, certificatesIntro, certificates, seminars, formats } =
    professionalDevelopmentContent;

  return (
    <>
      <PageHero
        eyebrow={professionalDevelopmentContent.eyebrow}
        title={certificatesTitle}
        lead={certificatesIntro}
        actions={
          <>
            <ButtonLink href={learningFormatsPath()} variant="primary">
              Learning Formats
            </ButtonLink>
            <ButtonLink href="/events/calendar" variant="secondary">
              Events Calendar
            </ButtonLink>
          </>
        }
      />

      <ContentSection
        title="Certificate courses"
        description="All CAISBE certificate programs for facility, property, and built-environment professionals."
        wide
      >
        <div className="grid gap-6 md:grid-cols-2">
          {certificates.map((certificate, index) => (
            <ContentCard
              key={certificate.slug}
              title={certificate.title}
              meta={certificate.code}
              description={certificate.description}
              href={certificatePath(certificate.slug)}
              hrefLabel="View Program"
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </ContentSection>

      <ContentSection
        title="Seminars"
        description="Professional seminars that complement certificate pathways and support continuing development."
        wide
      >
        <div className="grid gap-6 md:grid-cols-2">
          {seminars.map((seminar, index) => (
            <ContentCard
              key={seminar.title}
              title={seminar.title}
              meta="Seminar"
              description={seminar.description}
              href="/contact"
              hrefLabel="Inquire"
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </ContentSection>

      <CpdActivitiesTable />

      <ContentSection title={formats.title} description={formats.description}>
        <ButtonLink href={learningFormatsPath()} variant="secondary">
          Explore Learning Formats
        </ButtonLink>
      </ContentSection>
    </>
  );
}
