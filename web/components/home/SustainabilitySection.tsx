import { sectionSpacingClassName } from "@/components/pages/ContentPage";
import { bestPractices } from "@/lib/data/home";
import type { HomeCard } from "@/lib/sitePages";

export default function SustainabilitySection({
  eyebrow = "Practice",
  title,
  body,
  items,
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
  items?: HomeCard[];
}) {
  const cards = items ?? bestPractices.items;
  return (
    <section className={`bg-[#f8fafc] ${sectionSpacingClassName}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex max-w-2xl flex-col gap-3 motion-safe:animate-page-fade-in">
          {eyebrow ? (
            <p className="inline-flex w-fit rounded-full bg-caisbe-red/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-caisbe-red-dark">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
            {title ?? bestPractices.title}
          </h2>
          <p className="text-base leading-7 text-caisbe-muted">{body ?? bestPractices.description}</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((item, index) => (
            <article
              key={item.title}
              className="rounded-[20px] bg-white p-6 text-left shadow-hopewell transition duration-300 hover:-translate-y-1 motion-safe:animate-page-fade-in"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <h3 className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                {item.title}
              </h3>
              <p className="mt-2 text-base leading-7 text-caisbe-muted">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
