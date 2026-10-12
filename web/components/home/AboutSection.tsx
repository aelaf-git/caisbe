import { sectionSpacingClassName } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import { aboutContent, bestPractices } from "@/lib/data/home";
import type { HomeCard } from "@/lib/sitePages";

const fallbackHighlights: HomeCard[] = bestPractices.items.slice(0, 3).map((item) => ({
  title: item.title,
  description: `${item.description.split(". ")[0].replace(/\.$/, "")}.`,
}));

export default function AboutSection({
  tagline,
  eyebrow,
  body,
  cta,
  highlights,
}: {
  tagline?: string;
  eyebrow?: string;
  body?: string;
  cta?: string;
  highlights?: HomeCard[];
}) {
  const shownHighlights = highlights ?? fallbackHighlights;
  const button = cta ?? aboutContent.cta;

  return (
    <section className={`bg-[#f8fafc] ${sectionSpacingClassName}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full bg-caisbe-red/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-caisbe-red-dark">
            {eyebrow ?? aboutContent.eyebrow}
          </p>
          <h2 className="font-hopewell-display mt-4 text-3xl font-extrabold leading-tight tracking-tight text-caisbe-text-dark md:text-4xl">
            {tagline ?? aboutContent.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-caisbe-text">{body ?? aboutContent.description}</p>
        </div>
        {shownHighlights.length > 0 ? (
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {shownHighlights.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-caisbe-red text-sm font-bold text-white">
                  ✓
                </span>
                <div>
                  <h3 className="font-hopewell-display text-base font-bold text-caisbe-text-dark">{item.title}</h3>
                  <p className="mt-1 text-base leading-7 text-caisbe-muted">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {button ? (
          <ButtonLink href="/work-with-us" variant="pill" className="mt-8">
            {button}
          </ButtonLink>
        ) : null}
      </div>
    </section>
  );
}
