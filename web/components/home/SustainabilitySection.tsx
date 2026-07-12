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
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="brand-section-title text-3xl font-semibold">
            {bestPractices.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-caisbe-muted">
            {bestPractices.description}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bestPractices.items.map((item, index) => (
              <div
                key={item}
                className={`rounded-lg border bg-white px-4 py-8 text-sm font-semibold uppercase tracking-wide ${
                  index % 2 === 0
                    ? "border-caisbe-green/30 text-caisbe-green"
                    : "border-caisbe-red/30 text-caisbe-red"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
