import ButtonLink from "@/components/ui/ButtonLink";
import { aboutContent, bestPractices } from "@/lib/data/home";

const pillars = bestPractices.items.slice(0, 3);

export default function AboutSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="motion-safe:animate-page-fade-in">
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

        <ul className="grid gap-4">
          {pillars.map((item, index) => (
            <li
              key={item.title}
              className="border-l-4 border-caisbe-red bg-[#fafafa] px-5 py-4 motion-safe:animate-page-fade-in"
              style={{ animationDelay: `${120 + index * 80}ms` }}
            >
              <h3 className="text-base font-semibold text-caisbe-text-dark">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-caisbe-muted">
                {item.description.split(". ")[0].replace(/\.$/, "")}.
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
