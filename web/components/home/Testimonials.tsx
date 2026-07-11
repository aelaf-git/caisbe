import { testimonials, testimonialsIntro } from "@/lib/data/home";

export default function Testimonials() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            {testimonialsIntro.eyebrow}
          </p>
          <h2 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
            {testimonialsIntro.title}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((item) => (
            <blockquote
              key={item.name}
              className="brand-card-shadow rounded-lg border border-ifma-border-light border-l-4 border-l-caisbe-red bg-white p-8"
            >
              <p className="text-lg italic leading-8 text-caisbe-text">
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className="mt-6 border-t border-ifma-border-light pt-4">
                <p className="text-base font-semibold text-caisbe-green">
                  {item.name}
                </p>
                <p className="mt-1 text-sm uppercase tracking-wide text-caisbe-muted">
                  {item.role}
                </p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
