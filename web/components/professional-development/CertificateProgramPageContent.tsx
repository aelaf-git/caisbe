import ButtonLink from "@/components/ui/ButtonLink";
import BackButton from "@/components/ui/BackButton";
import CourseScrapeGuard from "@/components/security/CourseScrapeGuard";
import { courseDescriptionParagraphs } from "@/lib/courseSummary";
import { courseRegisterLoginUrl, type Course } from "@/lib/api";
import { getServerT } from "@/lib/i18n/server";

type CertificateProgramPageContentProps = {
  course: Course;
};

export default async function CertificateProgramPageContent({
  course,
}: CertificateProgramPageContentProps) {
  const { t } = await getServerT();
  const paragraphs = courseDescriptionParagraphs(course.description, course.title);
  const registerHref = courseRegisterLoginUrl(course.id);
  const lessonsClosed = course.content_published === false;

  return (
    <CourseScrapeGuard>
      <section className="bg-[#f8fafc] pt-10 pb-12 sm:pt-12 md:pb-16">
        <div className="mx-auto max-w-7xl px-4 motion-safe:animate-page-fade-in">
          <BackButton
            href="/professional-development"
            label={t(
              "Back to certificate programs",
              "Retour aux programmes de certificat",
            )}
          />

          <div className="mt-8 grid items-start gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,440px)] lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="inline-flex rounded-full bg-caisbe-red/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-caisbe-red-dark sm:px-4">
                  {t("Certificate Programs", "Programmes de certificat")}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-caisbe-muted">
                  {course.code}
                </p>
              </div>

              <h1 className="font-hopewell-display mt-4 max-w-3xl break-words text-3xl font-extrabold tracking-tight text-caisbe-text-dark sm:text-4xl">
                {course.title}
              </h1>
              <div className="mt-4 max-w-2xl space-y-4 sm:mt-5">
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className={`break-words text-caisbe-text ${
                        index === 0
                          ? "text-base leading-7 sm:text-lg sm:leading-8"
                          : "text-base leading-7"
                      }`}
                    >
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="break-words text-base leading-7 text-caisbe-text sm:text-lg sm:leading-8">
                    {t(
                      "A CAISBE certificate program for built-environment professionals.",
                      "Un programme de certificat CAISBE pour les professionnels du cadre bâti.",
                    )}
                  </p>
                )}
              </div>

              {lessonsClosed ? (
                <p className="mt-6 max-w-2xl border border-caisbe-red/20 bg-white px-4 py-3 text-sm font-semibold leading-6 text-caisbe-text-dark">
                  {t(
                    "This course is not ready yet.",
                    "Ce cours n’est pas encore prêt.",
                  )}
                </p>
              ) : null}

              <div className="mt-8 max-w-xl">
                <ButtonLink href={registerHref} variant="primary">
                  {t("Sign in to register", "Connectez-vous pour vous inscrire")}
                </ButtonLink>
                <p className="mt-4 text-sm leading-6 text-caisbe-muted">
                  {t(
                    "Sign in to buy this course and unlock lessons in myCAISBE. Course content stays private until you register.",
                    "Connectez-vous pour acheter ce cours et accéder aux leçons dans myCAISBE. Le contenu du cours reste privé jusqu’à votre inscription.",
                  )}
                </p>
              </div>
            </div>

            {course.cover_url ? (
              <div className="bg-white p-2 shadow-hopewell sm:p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={course.cover_url}
                  alt={course.title}
                  draggable={false}
                  className="h-auto w-full object-contain"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </CourseScrapeGuard>
  );
}
