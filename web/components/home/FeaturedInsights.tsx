import { featuredInsights } from "@/lib/data/home";

export default function FeaturedInsights() {
  return (
    <section className="bg-ifma-surface py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="ifma-section-title mb-10 text-center text-3xl font-semibold md:text-4xl">
          Featured Insights
        </h2>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featuredInsights.map((item) => (
            <article
              key={item.title}
              className="ifma-card-shadow flex flex-col border border-ifma-border-light bg-white"
            >
              <div className="h-44 bg-gradient-to-br from-ifma-navy via-ifma-blue to-ifma-highlight" />
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ifma-blue">
                  {item.tag}
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-snug text-ifma-navy">
                  {item.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-ifma-muted">
                  {item.description}
                </p>
                <span className="mt-5 inline-flex cursor-default text-sm font-semibold uppercase tracking-wide text-ifma-blue-bright">
                  {item.cta}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
