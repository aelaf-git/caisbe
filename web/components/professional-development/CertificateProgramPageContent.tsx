import ButtonLink from "@/components/ui/ButtonLink";
import type { CertificateProgram } from "@/lib/data/professional-development";
import { learningFormatsPath } from "@/lib/data/professional-development";

type CertificateProgramPageContentProps = {
  certificate: CertificateProgram;
};

export default function CertificateProgramPageContent({
  certificate,
}: CertificateProgramPageContentProps) {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
          Certificate Programs
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
          {certificate.code}
        </p>
        <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
          {certificate.title}
        </h1>
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {certificate.description}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/register" variant="primary">
            Enroll / Register
          </ButtonLink>
          <ButtonLink href={learningFormatsPath()} variant="secondary">
            Learning Formats
          </ButtonLink>
          <ButtonLink href="/professional-development" variant="text">
            All Certificate Programs
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
