import ButtonLink from "@/components/ui/ButtonLink";
import { aboutContent } from "@/lib/data/home";

export default function AboutSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-caisbe-red">
            {aboutContent.eyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-caisbe-text-dark md:text-4xl">
            {aboutContent.title}
          </h2>
          <p className="mt-6 text-base leading-8 text-caisbe-text">
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
