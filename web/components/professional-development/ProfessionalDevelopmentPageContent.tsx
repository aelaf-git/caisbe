import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import CpdActivitiesTable from "@/components/professional-development/CpdActivitiesTable";
import {
  courseProgramPath,
  fetchPublishedCourses,
} from "@/lib/api";
import {
  learningFormatsPath,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";

export default async function ProfessionalDevelopmentPageContent() {
  const { certificatesTitle, certificatesIntro, seminars, formats } =
    professionalDevelopmentContent;

  let courses: Awaited<ReturnType<typeof fetchPublishedCourses>> = [];
  try {
    courses = await fetchPublishedCourses();
  } catch {
    courses = [];
  }

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
        description="Published CAISBE certificate programs for facility, property, and built-environment professionals."
        wide
      >
        {courses.length === 0 ? (
          <p className="text-base leading-7 text-caisbe-muted">
            No certificate programs are published yet. Check back soon.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course, index) => (
              <ContentCard
                key={course.id}
                title={course.title}
                meta={course.code}
                description={course.description || undefined}
                href={courseProgramPath(course.slug)}
                hrefLabel="View Program"
                style={{ animationDelay: `${index * 70}ms` }}
              />
            ))}
          </div>
        )}
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
