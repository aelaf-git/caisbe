import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import { advocacyContent } from "@/lib/data/resources";

export default function AdvocacyPageContent() {
  return (
    <>
      <PageHero eyebrow="Resources" title={advocacyContent.title}>
        {advocacyContent.paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 48)}
            className="mt-6 text-base leading-7 text-caisbe-muted"
          >
            {paragraph}
          </p>
        ))}
      </PageHero>

      <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-base leading-7 text-caisbe-muted">
            {advocacyContent.servicesIntro}
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {advocacyContent.services.map((service) => (
              <article
                key={service.title}
                className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white p-6"
              >
                <h2 className="text-lg font-semibold text-caisbe-green">
                  {service.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-caisbe-muted">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-base leading-7 text-caisbe-muted">
            {advocacyContent.closing}
          </p>
          <div className="mt-8">
            <ButtonLink href="/contact" variant="primary">
              Contact Us
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
