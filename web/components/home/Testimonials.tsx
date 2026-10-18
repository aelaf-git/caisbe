import { sectionSpacingClassName } from "@/components/pages/ContentPage";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { fetchPublishedTestimonials } from "@/lib/api";
import { testimonials, testimonialsIntro } from "@/lib/data/home";

export default async function Testimonials({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title?: string;
}) {
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

  const shownEyebrow = eyebrow ?? testimonialsIntro.eyebrow;
  const heading = title ?? testimonialsIntro.title;

  return (
    <section className={`bg-[#f8fafc] ${sectionSpacingClassName}`}>
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <div className="mb-8 motion-safe:animate-page-fade-in">
          {shownEyebrow ? (
            <p className="inline-flex rounded-full bg-caisbe-red/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-caisbe-red-dark">
              {shownEyebrow}
            </p>
          ) : null}
          <h2 className="font-hopewell-display mt-4 text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
            {heading}
          </h2>
        </div>

        <HorizontalCarousel label={heading} itemClassName="w-[min(88vw,28rem)] shrink-0 snap-start sm:w-[28rem]">
          {items.map((item) => (
            <blockquote
              key={item.id}
              className="flex h-full flex-col rounded-[20px] bg-white p-6 shadow-hopewell transition duration-300 hover:-translate-y-1 md:p-8"
            >
              <p className="flex-1 text-base leading-7 text-caisbe-text md:text-lg">
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className="mt-4">
                <p className="text-base font-bold text-caisbe-text-dark">{item.name}</p>
                <p className="mt-1 text-base text-caisbe-muted">{item.role}</p>
              </footer>
            </blockquote>
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
