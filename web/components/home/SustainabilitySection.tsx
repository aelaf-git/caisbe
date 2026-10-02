import { bestPractices } from "@/lib/data/home";

export default function SustainabilitySection() {
  return (
    <section className="bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex max-w-2xl flex-col gap-3 motion-safe:animate-page-fade-in">
          <p className="inline-flex w-fit rounded-full bg-caisbe-red/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-caisbe-red-dark">
            Practice
          </p>
          <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
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
              className="rounded-[20px] bg-white p-6 text-left shadow-hopewell transition duration-300 hover:-translate-y-1 motion-safe:animate-page-fade-in"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <h3 className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-caisbe-muted">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
