import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  PageHero,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import EventCalendarList from "@/components/events/EventCalendarList";
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

function ThinEventsPage({
  slug,
}: {
  slug: "conferences" | "get-involved";
}) {
  const page = eventsPages[slug];
  return (
    <>
      <PageHero
        eyebrow="Events"
        title={page.title}
        lead={page.lead}
        actions={
          <>
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
            <ButtonLink href="/events/calendar" variant="secondary">
              Event Calendar
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {page.description}
        </p>
      </PageHero>
      <ContentSection title="What you will find">
        <ul className="grid gap-3 sm:grid-cols-2">
          {page.highlights.map((item) => (
            <li
              key={item}
              className="shadow-brand-card rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-text"
            >
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-base leading-7 text-caisbe-muted">
          {page.nextSteps}
        </p>
      </ContentSection>
    </>
  );
}

function CalendarPage() {
  const page = eventsPages.calendar;
  return (
    <>
      <PageHero
        eyebrow="Events"
        title={page.title}
        lead={page.lead}
        actions={
          <>
            <ButtonLink href="/contact" variant="primary">
              Suggest an Event
            </ButtonLink>
            <ButtonLink href="/events" variant="secondary">
              All Events
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {page.description}
        </p>
      </PageHero>
      <EventCalendarList />
    </>
  );
}

function SponsorComingSoon() {
  const page = eventsPages.sponsor;
  return (
    <PageHero
      eyebrow="Coming Soon"
      title={page.title}
      lead="Sponsorship and advertising packages for CAISBE events are being finalized. Thank you for your patience—we will publish opportunities here soon."
      actions={
        <>
          <ButtonLink href="/events/calendar" variant="primary">
            View Event Calendar
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact Us
          </ButtonLink>
        </>
      }
    >
      <p className="mt-6 text-base leading-7 text-caisbe-muted">
        {page.description}
      </p>
    </PageHero>
  );
}

export function EventsSubpageContent({ slug }: { slug: EventsSlug }) {
  if (slug === "calendar") {
    return <CalendarPage />;
  }

  if (slug === "sponsor") {
    return <SponsorComingSoon />;
  }

  if (slug === "expo") {
    const page = eventsPages.expo;
    return (
      <>
        <PageHero
          eyebrow="Events"
          title={page.title}
          lead={page.description}
          actions={
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
          }
        >
          <p className="mt-6 text-base leading-7 text-caisbe-muted">
            {page.intro}
          </p>
        </PageHero>
        <ContentSection title={page.objectivesTitle}>
          <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-caisbe-muted">
            {page.objectives.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentSection>
        <ContentSection title={page.participantsTitle}>
          <p className="text-base leading-7 text-caisbe-muted">
            {page.participants}
          </p>
        </ContentSection>
      </>
    );
  }

  if (slug === "awards") {
    const page = eventsPages.awards;
    return (
      <>
        <PageHero
          eyebrow="Events"
          title={page.title}
          lead={page.description}
          actions={
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
          }
        >
          <p className="mt-6 text-base leading-7 text-caisbe-muted">
            {page.intro}
          </p>
        </PageHero>
        <ContentSection title="Award categories">
          <ul className="grid gap-3 sm:grid-cols-2">
            {page.categories.map((category) => (
              <li
                key={category}
                className="shadow-brand-card rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-red"
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
              className="font-semibold text-caisbe-red transition-colors hover:text-caisbe-red-dark"
            >
              {page.email}
            </a>
          </p>
        </ContentSection>
      </>
    );
  }

  return <ThinEventsPage slug={slug} />;
}
