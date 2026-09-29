import { bestPractices } from "@/lib/data/home";

export default function SustainabilitySection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-3 md:max-w-2xl motion-safe:animate-page-fade-in">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-caisbe-red">
            Practice
          </p>
          <h2 className="font-display text-3xl font-semibold text-caisbe-text-dark md:text-4xl">
            {bestPractices.title}
          </h2>
          <p className="text-base leading-7 text-caisbe-muted">
            {bestPractices.description}
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bestPractices.items.map((item, index) => (
            <article
              key={item.title}
              className="shadow-brand-card rounded-lg border border-ifma-border-light bg-white p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-caisbe-red/40 motion-safe:animate-page-fade-in"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <h3 className="text-lg font-semibold text-caisbe-text-dark">
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
  );
}
