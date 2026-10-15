import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import CourseScrapeGuard from "@/components/security/CourseScrapeGuard";
import { courseShortSummary } from "@/lib/courseSummary";
import { courseRegisterLoginUrl, type Course } from "@/lib/api";
import { getServerT } from "@/lib/i18n/server";

type CertificateProgramPageContentProps = {
  course: Course;
};

export default async function CertificateProgramPageContent({
  course,
}: CertificateProgramPageContentProps) {
  const { t } = await getServerT();
  const summary = courseShortSummary(course.description);
  const registerHref = courseRegisterLoginUrl(course.id);

  return (
    <CourseScrapeGuard>
      <PageHero
        eyebrow={t("Certificate Programs", "Programmes de certificat")}
        title={course.title}
        lead={summary}
        backHref="/professional-development"
        backLabel={t("Back to certificate programs", "Retour aux programmes de certificat")}
        actions={
          <ButtonLink href={registerHref} variant="primary">
            {t("Sign in to register", "Connectez-vous pour vous inscrire")}
          </ButtonLink>
        }
      >
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
          {course.code}
        </p>
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_url}
            alt=""
            draggable={false}
            className="mt-8 aspect-video w-full max-w-2xl rounded-[20px] object-cover shadow-hopewell"
          />
        ) : null}
        <p className="mt-6 max-w-2xl text-sm leading-6 text-caisbe-muted">
          {t(
            "Sign in to buy this course and unlock lessons in myCAISBE. Course content stays private until you register.",
            "Connectez-vous pour acheter ce cours et accéder aux leçons dans myCAISBE. Le contenu du cours reste privé jusqu’à votre inscription.",
          )}
        </p>
      </PageHero>
    </CourseScrapeGuard>
  );
}
