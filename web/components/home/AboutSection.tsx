import ButtonLink from "@/components/ui/ButtonLink";
import { aboutContent, bestPractices } from "@/lib/data/home";

const pillars = bestPractices.items.slice(0, 3);

export default function AboutSection() {
  return (
    <section className="bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero_1.jpeg"
            alt=""
            className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-hopewell"
          />
        </div>

        <div>
          <p className="inline-flex rounded-full bg-caisbe-red/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-caisbe-red-dark">
            {aboutContent.eyebrow}
          </p>
          <h2 className="font-hopewell-display mt-4 text-3xl font-extrabold leading-tight tracking-tight text-caisbe-text-dark md:text-4xl">
            {aboutContent.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-caisbe-text">
            {aboutContent.description}
          </p>
          <ul className="mt-6 grid gap-4">
            {pillars.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-caisbe-red text-sm font-bold text-white">
                  ✓
                </span>
                <div>
                  <h3 className="font-hopewell-display text-base font-bold text-caisbe-text-dark">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-caisbe-muted">
                    {item.description.split(". ")[0].replace(/\.$/, "")}.
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <ButtonLink href="/work-with-us" variant="pill" className="mt-8">
            {aboutContent.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
