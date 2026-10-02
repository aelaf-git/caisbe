import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import { courseEnrollUrl, type Course } from "@/lib/api";

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
      backHref="/professional-development"
      backLabel="Back to certificate programs"
      actions={
        <ButtonLink href={courseEnrollUrl(course.id)} variant="primary">
          Enroll / Register
        </ButtonLink>
      }
    >
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
        {course.code}
      </p>
    </PageHero>
  );
}
