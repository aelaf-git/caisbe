import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import {
  courseProgramPath,
  fetchPublishedCourses,
  fetchPublishedSeminars,
} from "@/lib/api";
import { courseShortSummary } from "@/lib/courseSummary";
import {
  learningFormatsPath,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";
import { fetchPublishedSitePage } from "@/lib/sitePages";

export default async function ProfessionalDevelopmentPageContent() {
  const { certificatesTitle, certificatesIntro, seminars: fallbackSeminars, formats } =
    professionalDevelopmentContent;
  const page = await fetchPublishedSitePage("/professional-development");
  const [coursesSection, seminarsSection, formatsSection] = page?.sections ?? [];

  let courses: Awaited<ReturnType<typeof fetchPublishedCourses>> = [];
  try {
    courses = await fetchPublishedCourses();
  } catch {
    courses = [];
  }

  let seminars: { title: string; description: string }[] = [...fallbackSeminars];
  try {
    seminars = await fetchPublishedSeminars();
  } catch {
    seminars = [...fallbackSeminars];
  }

  return (
    <>
      <PageHero
        eyebrow={professionalDevelopmentContent.eyebrow}
        title={page?.title?.trim() || certificatesTitle}
        lead={page?.lead?.trim() || certificatesIntro}
        actions={
          <>
            <ButtonLink href={page?.ctaHref || learningFormatsPath()} variant="primary">
              {page?.ctaLabel?.trim() || "Learning Formats"}
            </ButtonLink>
            <ButtonLink href="/events/calendar" variant="secondary">
              Events Calendar
            </ButtonLink>
          </>
        }
      />

      <ContentSection
        title={coursesSection?.title?.trim() || "Certificate courses"}
        description={
          coursesSection?.body?.trim() ||
          "Published CAISBE certificate programs for facility, property, and built-environment professionals."
        }
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
                description={courseShortSummary(course.description)}
                href={courseProgramPath(course.slug)}
                hrefLabel="View Program"
                style={{ animationDelay: `${index * 70}ms` }}
              />
            ))}
          </div>
        )}
      </ContentSection>

      <ContentSection
        title={seminarsSection?.title?.trim() || "Seminars"}
        description={
          seminarsSection?.body?.trim() ||
          "Professional seminars that complement certificate pathways and support continuing development."
        }
        wide
      >
        {seminars.length === 0 ? (
          <p className="text-base leading-7 text-caisbe-muted">
            No seminars are published yet. Check back soon.
          </p>
        ) : (
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
        )}
      </ContentSection>

      <ContentSection
        title={formatsSection?.title?.trim() || formats.title}
        description={formatsSection?.body?.trim() || formats.description}
      >
        <ButtonLink href={learningFormatsPath()} variant="secondary">
          Explore Learning Formats
        </ButtonLink>
      </ContentSection>
    </>
  );
}
