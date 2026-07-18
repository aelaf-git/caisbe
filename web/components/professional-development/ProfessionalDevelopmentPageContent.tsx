import ButtonLink from "@/components/ui/ButtonLink";
import {
  certificatePath,
  learningFormatsPath,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";

export default function ProfessionalDevelopmentPageContent() {
  const { certificatesTitle, certificatesIntro, certificates, formats } =
    professionalDevelopmentContent;

  return (
    <>
      <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
              {professionalDevelopmentContent.eyebrow}
            </p>
            <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
              {certificatesTitle}
            </h1>
            <p className="mt-6 text-base leading-7 text-caisbe-muted">
              {certificatesIntro}
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {certificates.map((certificate) => (
              <article
                key={certificate.slug}
                className="brand-card-shadow flex flex-col rounded-lg border border-ifma-border-light bg-white p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
                  {certificate.code}
                </p>
                <h2 className="mt-3 text-xl font-semibold leading-snug text-caisbe-green">
                  {certificate.title}
                </h2>
                <p className="mt-4 flex-1 text-sm leading-6 text-caisbe-muted">
                  {certificate.description}
                </p>
                <ButtonLink
                  href={certificatePath(certificate.slug)}
                  variant="text"
                  className="mt-6"
                >
                  View Program
                </ButtonLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="brand-section-title text-3xl font-semibold">
            {formats.title}
          </h2>
          <p className="mt-6 text-base leading-7 text-caisbe-muted">
            {formats.description}
          </p>
          <div className="mt-8">
            <ButtonLink href={learningFormatsPath()} variant="secondary">
              Explore Learning Formats
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
