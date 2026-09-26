import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import type { CertificateProgram } from "@/lib/data/professional-development";
import { learningFormatsPath } from "@/lib/data/professional-development";

type CertificateProgramPageContentProps = {
  certificate: CertificateProgram;
};

export default function CertificateProgramPageContent({
  certificate,
}: CertificateProgramPageContentProps) {
  return (
    <PageHero
      eyebrow="Certificate Programs"
      title={certificate.title}
      lead={certificate.description}
      actions={
        <>
          <ButtonLink href="/register" variant="primary">
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
        {certificate.code}
      </p>
    </PageHero>
  );
}
