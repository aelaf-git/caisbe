import { aboutContent } from "@/lib/data/home";

export default function AboutSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2">
        <div className="h-72 bg-gradient-to-br from-ifma-navy via-ifma-blue to-ifma-highlight lg:h-full lg:min-h-[420px]" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-ifma-blue">
            {aboutContent.eyebrow}
          </p>
          <h2 className="ifma-section-title mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            {aboutContent.title}
          </h2>
          <p className="mt-6 text-base leading-7 text-ifma-muted">
            {aboutContent.description}
          </p>
          <span className="mt-8 inline-flex cursor-default border-2 border-ifma-navy bg-ifma-navy px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white">
            {aboutContent.cta}
          </span>
        </div>
      </div>
    </section>
  );
}
