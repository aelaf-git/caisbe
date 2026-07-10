import { bestPractices, sustainabilityContent } from "@/lib/data/home";

export default function SustainabilitySection() {
  return (
    <>
      <section className="bg-ifma-highlight py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-ifma-blue">
            Sustainability
          </p>
          <h2 className="ifma-section-title mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            {sustainabilityContent.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-ifma-muted">
            {sustainabilityContent.description}
          </p>
          <span className="mt-8 inline-flex cursor-default border-2 border-ifma-navy bg-ifma-navy px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white">
            {sustainabilityContent.cta}
          </span>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="ifma-section-title text-3xl font-semibold">
            {bestPractices.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-ifma-muted">
            {bestPractices.description}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bestPractices.items.map((item) => (
              <div
                key={item}
                className="border border-ifma-border-light bg-ifma-surface px-4 py-8 text-sm font-semibold uppercase tracking-wide text-ifma-navy"
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
