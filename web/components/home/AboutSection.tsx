import ButtonLink from "@/components/ui/ButtonLink";
import { aboutContent } from "@/lib/data/home";

export default function AboutSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2">
        <div className="brand-media-placeholder h-72 rounded-lg lg:h-full lg:min-h-[420px]" />
        <div>
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            {aboutContent.eyebrow}
          </p>
          <h2 className="brand-section-title mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            {aboutContent.title}
          </h2>
          <p className="mt-6 text-base leading-7 text-caisbe-muted">
            {aboutContent.description}
          </p>
          <ButtonLink href="/work-with-us" variant="green" className="mt-8">
            {aboutContent.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
