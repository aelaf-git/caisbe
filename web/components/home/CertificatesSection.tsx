import { sectionSpacingClassName } from "@/components/pages/ContentPage";
import Link from "next/link";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import {
  courseProgramPath,
  fetchPublishedCourses,
} from "@/lib/api";
import { courseShortSummary } from "@/lib/courseSummary";
import { certificatesIntro } from "@/lib/data/home";
import { getServerT } from "@/lib/i18n/server";

export default async function CertificatesSection({
  title,
  subtitle,
  cta,
  emptyMessage = "Certificate programs will appear here once published by CAISBE.",
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  emptyMessage?: string;
}) {
  const { t } = await getServerT();
  const heading = title ?? certificatesIntro.title;
  const line = subtitle ?? certificatesIntro.subtitle;
  const linkLabel =
    cta ||
    t("Find out more about our training courses", "En savoir plus sur nos formations");
  let courses: Awaited<ReturnType<typeof fetchPublishedCourses>> = [];
  try {
    courses = await fetchPublishedCourses();
  } catch {
    courses = [];
  }

  return (
    <section className={`bg-white ${sectionSpacingClassName}`}>
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-caisbe-muted md:text-lg">{line}</p>
          <Link
            href="/professional-development"
            className="mt-5 inline-flex items-center gap-1 text-base font-bold text-caisbe-red transition hover:text-caisbe-red-dark"
          >
            {linkLabel}
            <span aria-hidden className="text-lg leading-none">
              ›
            </span>
          </Link>
        </div>

        {courses.length === 0 ? (
          <p className="text-center text-base leading-7 text-caisbe-muted">{emptyMessage}</p>
        ) : (
          <HorizontalCarousel label={heading}>
            {courses.map((course) => (
              <Link
                key={course.id}
                href={courseProgramPath(course.slug)}
                className="flex h-full flex-col overflow-hidden rounded-none bg-[#f8fafc] shadow-hopewell transition duration-300 hover:-translate-y-1"
              >
                {course.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.cover_url}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center bg-[#f7f9fa] px-4">
                    <p className="text-base font-semibold text-caisbe-red">{course.code}</p>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-hopewell-display text-lg font-bold leading-snug text-caisbe-text-dark">
                    {course.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-base leading-7 text-caisbe-muted">
                    {courseShortSummary(course.description)}
                  </p>
                  <span className="mt-4 text-base font-bold text-caisbe-red">
                    {t("View Program", "Voir le programme")}
                  </span>
                </div>
              </Link>
            ))}
          </HorizontalCarousel>
        )}
      </div>
    </section>
  );
}
