import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import { courseEnrollUrl, type Course } from "@/lib/api";
import { learningFormatsPath } from "@/lib/data/professional-development";

type CertificateProgramPageContentProps = {
  course: Course;
};

export default function CertificateProgramPageContent({
  course,
}: CertificateProgramPageContentProps) {
  return (
    <PageHero
      eyebrow="Certificate Programs"
      title={course.title}
      lead={course.description || "A CAISBE certificate program for built-environment professionals."}
      actions={
        <>
          <ButtonLink href={courseEnrollUrl(course.id)} variant="primary">
            Enroll / Register
          </ButtonLink>
          <ButtonLink href={learningFormatsPath()} variant="secondary">
            Learning Formats
          </ButtonLink>
          <ButtonLink href="/professional-development" variant="secondary">
            All Certificate Programs
          </ButtonLink>
        </>
      }
    >
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
        {course.code}
      </p>
    </PageHero>
  );
}
