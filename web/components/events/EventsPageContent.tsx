import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero, SubsectionIndex } from "@/components/pages/ContentPage";
import {
  eventsIndexItems,
  eventsPages,
  type EventsSlug,
} from "@/lib/data/events";

export function EventsIndexContent() {
  return (
    <SubsectionIndex
      eyebrow="Events"
      title="Events"
      description="Explore CAISBE events, the Africa–Canada Built Environment Expo & Forum, conferences, and awards."
      items={eventsIndexItems}
    />
  );
}

export function EventsSubpageContent({ slug }: { slug: EventsSlug }) {
  if (slug === "expo") {
    const page = eventsPages.expo;
    return (
      <PageHero eyebrow="Events" title={page.title}>
        <p className="mt-6 text-base leading-7 text-caisbe-muted">{page.intro}</p>
        <h2 className="mt-10 text-xl font-semibold text-caisbe-green">
          {page.objectivesTitle}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-caisbe-muted">
          {page.objectives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h2 className="mt-10 text-xl font-semibold text-caisbe-green">
          {page.participantsTitle}
        </h2>
        <p className="mt-4 text-base leading-7 text-caisbe-muted">
          {page.participants}
        </p>
        <div className="mt-10">
          <ButtonLink href={page.ctaHref} variant="primary">
            {page.ctaLabel}
          </ButtonLink>
        </div>
      </PageHero>
    );
  }

  if (slug === "awards") {
    const page = eventsPages.awards;
    return (
      <PageHero eyebrow="Events" title={page.title}>
        <p className="mt-6 text-base leading-7 text-caisbe-muted">{page.intro}</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {page.categories.map((category) => (
            <li
              key={category}
              className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-green"
            >
              {category}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-base leading-7 text-caisbe-muted">
          {page.nominate}
        </p>
        <p className="mt-4 text-base leading-7 text-caisbe-text">
          {page.inquiryLabel}{" "}
          <a
            href={`mailto:${page.email}`}
            className="font-semibold text-caisbe-red transition-colors hover:text-caisbe-green"
          >
            {page.email}
          </a>
        </p>
        <div className="mt-10">
          <ButtonLink href={page.ctaHref} variant="primary">
            {page.ctaLabel}
          </ButtonLink>
        </div>
      </PageHero>
    );
  }

  if (slug === "get-involved") {
    const page = eventsPages["get-involved"];
    return (
      <PageHero
        eyebrow="Events"
        title={page.title}
        actions={
          <ButtonLink href={page.ctaHref} variant="primary">
            {page.ctaLabel}
          </ButtonLink>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {page.description}
        </p>
      </PageHero>
    );
  }

  if (slug === "sponsor") {
    const page = eventsPages.sponsor;
    return (
      <PageHero
        eyebrow="Events"
        title={page.title}
        actions={
          <ButtonLink href={page.ctaHref} variant="primary">
            {page.ctaLabel}
          </ButtonLink>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {page.description}
        </p>
      </PageHero>
    );
  }

  const page = eventsPages[slug];
  return (
    <PageHero eyebrow="Events" title={page.title}>
      <p className="mt-6 text-base leading-7 text-caisbe-muted">
        {page.description}
      </p>
      <div className="mt-10">
        <ButtonLink href="/events" variant="secondary">
          All Events
        </ButtonLink>
      </div>
    </PageHero>
  );
}
