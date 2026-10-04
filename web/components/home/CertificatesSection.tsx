import Link from "next/link";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  courseProgramPath,
  fetchPublishedCourses,
} from "@/lib/api";
import { certificatesIntro } from "@/lib/data/home";

export default async function CertificatesSection() {
  let courses: Awaited<ReturnType<typeof fetchPublishedCourses>> = [];
  try {
    courses = await fetchPublishedCourses();
  } catch {
    courses = [];
  }

  if (courses.length === 0) {
    return (
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
                {certificatesIntro.title}
              </h2>
              <p className="mt-2 text-base text-caisbe-muted">
                {certificatesIntro.subtitle}
              </p>
            </div>
            <ButtonLink href="/professional-development" variant="text">
              {certificatesIntro.cta}
            </ButtonLink>
          </div>
          <p className="text-base leading-7 text-caisbe-muted">
            Certificate programs will appear here once published by CAISBE.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
              {certificatesIntro.title}
            </h2>
            <p className="mt-2 text-base text-caisbe-muted">
              {certificatesIntro.subtitle}
            </p>
          </div>
          <ButtonLink href="/professional-development" variant="text">
            {certificatesIntro.cta}
          </ButtonLink>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, index) => (
            <Link
              key={course.id}
              href={courseProgramPath(course.slug)}
              className="flex flex-col overflow-hidden rounded-[20px] bg-white shadow-hopewell transition duration-300 hover:-translate-y-1 motion-safe:animate-page-fade-in"
              style={{ animationDelay: `${index * 70}ms` }}
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
                  <p className="text-base font-semibold text-caisbe-red">
                    {course.code}
                  </p>
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-hopewell-display text-lg font-bold leading-snug text-caisbe-text-dark">
                  {course.title}
                </h3>
                <p className="mt-2 line-clamp-3 flex-1 text-base leading-7 text-caisbe-muted">
                  {course.description}
                </p>
                <span className="mt-4 text-base font-bold text-caisbe-red">
                  View Program
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
