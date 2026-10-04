import ButtonLink from "@/components/ui/ButtonLink";
import { partnersContent } from "@/lib/data/partners";

export default function PartnersSection() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <p className="inline-flex rounded-full bg-caisbe-red/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-caisbe-red-dark">
          Partnerships
        </p>
        <h2 className="font-hopewell-display mt-4 text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
          {partnersContent.thankYouTitle}
        </h2>
        <p className="mt-4 text-base leading-8 text-caisbe-text">
          {partnersContent.thankYouLead}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/partners" variant="primary">
            Learn about partnerships
          </ButtonLink>
          <ButtonLink href={`mailto:${partnersContent.contactEmail}`} variant="secondary">
            {partnersContent.ctaLabel}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
