import { fetchPublishedTestimonials } from "@/lib/api";
import { testimonials, testimonialsIntro } from "@/lib/data/home";

export default async function Testimonials() {
  let items = testimonials.map((item, index) => ({ ...item, id: index }));
  try {
    const published = await fetchPublishedTestimonials();
    items = published.map((item) => ({
      id: item.id,
      quote: item.quote,
      name: item.name,
      role: item.role,
    }));
  } catch {
    items = testimonials.map((item, index) => ({ ...item, id: index }));
  }

  if (items.length === 0) return null;

  return (
    <section className="bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 motion-safe:animate-page-fade-in">
          <p className="inline-flex rounded-full bg-caisbe-red/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-caisbe-red-dark">
            {testimonialsIntro.eyebrow}
          </p>
          <h2 className="font-hopewell-display mt-4 text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
            {testimonialsIntro.title}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item, index) => (
            <blockquote
              key={item.id}
              className="rounded-[20px] bg-white p-6 shadow-hopewell transition duration-300 hover:-translate-y-1 motion-safe:animate-page-fade-in md:p-8"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <p className="text-base leading-7 text-caisbe-text md:text-lg">
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className="mt-4">
                <p className="text-base font-bold text-caisbe-text-dark">{item.name}</p>
                <p className="mt-1 text-base text-caisbe-muted">{item.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
