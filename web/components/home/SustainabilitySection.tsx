import ButtonLink from "@/components/ui/ButtonLink";
import { bestPractices, sustainabilityContent } from "@/lib/data/home";

export default function SustainabilitySection() {
  return (
    <>
      <section className="border-b border-ifma-border-light bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            Sustainability
          </p>
          <h2 className="brand-section-title mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            {sustainabilityContent.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-caisbe-muted">
            {sustainabilityContent.description}
          </p>
          <ButtonLink href="/contact" variant="green" className="mt-8">
            {sustainabilityContent.cta}
          </ButtonLink>
        </div>
      </section>

      <section className="border-b border-ifma-border-light bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="brand-section-title text-3xl font-semibold">
              {bestPractices.title}
            </h2>
            <p className="mt-3 text-base text-caisbe-muted">
              {bestPractices.description}
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {bestPractices.items.map((item, index) => (
              <article
                key={item.title}
                className={`brand-card-shadow rounded-lg border bg-white p-6 text-left ${
                  index % 2 === 0
                    ? "border-caisbe-green/30"
                    : "border-caisbe-red/30"
                }`}
              >
                <h3
                  className={`text-lg font-semibold ${
                    index % 2 === 0 ? "text-caisbe-green" : "text-caisbe-red"
                  }`}
                >
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-caisbe-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
