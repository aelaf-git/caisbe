import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import CourseScrapeGuard from "@/components/security/CourseScrapeGuard";
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
import { getServerT } from "@/lib/i18n/server";

export default async function ProfessionalDevelopmentPageContent() {
  const { certificatesTitle, certificatesIntro, seminars: fallbackSeminars, formats } =
    professionalDevelopmentContent;
  const { t } = await getServerT();
  const page = await fetchPublishedSitePage("/professional-development");
  const [coursesSection, seminarsSection, formatsSection] = page?.sections ?? [];

  let courses: Awaited<ReturnType<typeof fetchPublishedCourses>> = [];
  try {
    courses = await fetchPublishedCourses();
  } catch {
    courses = [];
  }

  let seminars: {
    id?: number;
    title: string;
    description: string;
    cover_url?: string | null;
  }[] = [...fallbackSeminars];
  try {
    seminars = await fetchPublishedSeminars();
  } catch {
    seminars = [...fallbackSeminars];
  }

  return (
    <>
      <PageHero
        eyebrow={t(professionalDevelopmentContent.eyebrow, "Développement professionnel")}
        title={page?.title?.trim() || certificatesTitle}
        lead={page?.lead?.trim() || certificatesIntro}
        actions={
          <>
            <ButtonLink href={page?.ctaHref || learningFormatsPath()} variant="primary">
              {page?.ctaLabel?.trim() || t("Learning Formats", "Formats d’apprentissage")}
            </ButtonLink>
            <ButtonLink href="/events/calendar" variant="secondary">
              {t("Events Calendar", "Calendrier des événements")}
            </ButtonLink>
          </>
        }
      />

      <ContentSection
        title={coursesSection?.title?.trim() || t("Certificate courses", "Cours de certificat")}
        description={
          coursesSection?.body?.trim() ||
          t(
            "Published CAISBE certificate programs for facility, property, and built-environment professionals.",
            "Programmes de certificat du CAISBE publiés à l’intention des professionnels des installations, de l’immobilier et de l’environnement bâti.",
          )
        }
        wide
      >
        {courses.length === 0 ? (
          <p className="text-base leading-7 text-caisbe-muted">
            {t(
              "No certificate programs are published yet. Check back soon.",
              "Aucun programme de certificat n’est encore publié. Revenez bientôt.",
            )}
          </p>
        ) : (
          <CourseScrapeGuard>
            <div className="grid gap-6 md:grid-cols-2">
              {courses.map((course, index) => (
                <ContentCard
                  key={course.id}
                  title={course.title}
                  meta={course.code}
                  description={courseShortSummary(course.description)}
                  href={courseProgramPath(course.slug)}
                  hrefLabel={t("View Program", "Voir le programme")}
                  style={{ animationDelay: `${index * 70}ms` }}
                />
              ))}
            </div>
          </CourseScrapeGuard>
        )}
      </ContentSection>

      <ContentSection
        title={seminarsSection?.title?.trim() || t("Seminars", "Séminaires")}
        description={
          seminarsSection?.body?.trim() ||
          t(
            "Professional seminars that complement certificate pathways and support continuing development.",
            "Séminaires professionnels qui complètent les parcours de certificat et soutiennent le perfectionnement continu.",
          )
        }
        wide
      >
        {seminars.length === 0 ? (
          <p className="text-base leading-7 text-caisbe-muted">
            {t(
              "No seminars are published yet. Check back soon.",
              "Aucun séminaire n’est encore publié. Revenez bientôt.",
            )}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {seminars.map((seminar, index) => (
              <ContentCard
                key={seminar.id ?? seminar.title}
                title={seminar.title}
                meta={t("Seminar", "Séminaire")}
                description={seminar.description}
                imageUrl={seminar.cover_url}
                href={
                  seminar.id
                    ? `/professional-development/seminars/${seminar.id}/register`
                    : "/contact"
                }
                hrefLabel={
                  seminar.id
                    ? t("Register", "S’inscrire")
                    : t("Inquire", "Se renseigner")
                }
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
          {t("Explore Learning Formats", "Explorer les formats d’apprentissage")}
        </ButtonLink>
      </ContentSection>
    </>
  );
}
