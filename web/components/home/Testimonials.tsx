import { testimonials, testimonialsIntro } from "@/lib/data/home";

export default function Testimonials() {
  return (
    <section className="border-b border-ifma-border-light bg-[#fafafa] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 motion-safe:animate-page-fade-in">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-caisbe-red">
            {testimonialsIntro.eyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-caisbe-text-dark md:text-4xl">
            {testimonialsIntro.title}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <blockquote
              key={item.name}
              className="rounded-lg border border-ifma-border-light border-l-4 border-l-caisbe-red bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-brand-card motion-safe:animate-page-fade-in md:p-8"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <p className="text-base leading-8 text-caisbe-text md:text-lg">
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className="mt-6">
                <p className="text-base font-semibold text-caisbe-text-dark">
                  {item.name}
                </p>
                <p className="mt-1 text-sm text-caisbe-muted">{item.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
