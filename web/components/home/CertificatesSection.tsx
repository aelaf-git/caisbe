import ButtonLink from "@/components/ui/ButtonLink";
import { certificates, certificatesIntro } from "@/lib/data/home";

export default function CertificatesSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="ifma-section-title text-3xl font-semibold md:text-4xl">
              {certificatesIntro.title}
            </h2>
            <p className="mt-2 text-lg text-ifma-muted">
              {certificatesIntro.subtitle}
            </p>
          </div>
          <ButtonLink href="/certifications" variant="text">
            {certificatesIntro.cta}
          </ButtonLink>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate) => (
            <article
              key={certificate.code}
              className="ifma-card-shadow flex flex-col border border-ifma-border-light bg-white p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
                {certificate.code}
              </p>
              <h3 className="mt-3 text-lg font-semibold leading-snug text-ifma-navy">
                {certificate.title}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-6 text-ifma-muted">
                {certificate.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
