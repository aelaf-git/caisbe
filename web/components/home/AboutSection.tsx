import ButtonLink from "@/components/ui/ButtonLink";
import { aboutContent } from "@/lib/data/home";

export default function AboutSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-4xl px-4">
        <p className="text-caisbe-red text-sm font-semibold uppercase tracking-[0.25em]">
          {aboutContent.eyebrow}
        </p>
        <h2 className="font-display text-caisbe-text-dark mt-3 text-3xl font-semibold leading-tight md:text-4xl">
          {aboutContent.title}
        </h2>
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {aboutContent.description}
        </p>
        <ButtonLink href="/work-with-us" variant="green" className="mt-8">
          {aboutContent.cta}
        </ButtonLink>
      </div>
    </section>
  );
}
