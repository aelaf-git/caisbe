import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import { courseShortSummary } from "@/lib/courseSummary";
import { courseRegisterLoginUrl, type Course } from "@/lib/api";

type CertificateProgramPageContentProps = {
  course: Course;
};

export default function CertificateProgramPageContent({
  course,
}: CertificateProgramPageContentProps) {
  const summary = courseShortSummary(course.description);
  const registerHref = courseRegisterLoginUrl(course.id);

  return (
    <PageHero
      eyebrow="Certificate Programs"
      title={course.title}
      lead={summary}
      backHref="/professional-development"
      backLabel="Back to certificate programs"
      actions={
        <ButtonLink href={registerHref} variant="primary">
          Sign in to register
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
          className="mt-8 aspect-video w-full max-w-2xl rounded-[20px] object-cover shadow-hopewell"
        />
      ) : null}
      <p className="mt-6 max-w-2xl text-sm leading-6 text-caisbe-muted">
        Sign in to buy this course and unlock lessons in myCAISBE. Course content stays private until
        you register.
      </p>
    </PageHero>
  );
}
