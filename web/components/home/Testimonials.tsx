import { testimonials, testimonialsIntro } from "@/lib/data/home";

export default function Testimonials() {
  return (
    <section className="bg-ifma-highlight py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-ifma-blue">
            {testimonialsIntro.eyebrow}
          </p>
          <h2 className="ifma-section-title mt-3 text-3xl font-semibold md:text-4xl">
            {testimonialsIntro.title}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((item) => (
            <blockquote
              key={item.name}
              className="ifma-card-shadow border border-ifma-border-light bg-white p-8"
            >
              <p className="text-lg italic leading-8 text-ifma-text">
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className="mt-6 border-t border-ifma-border-light pt-4">
                <p className="text-base font-semibold text-ifma-navy">
                  {item.name}
                </p>
                <p className="mt-1 text-sm uppercase tracking-wide text-ifma-muted">
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
