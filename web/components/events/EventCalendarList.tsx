"use client";

import { useEffect, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentCard, ContentSection } from "@/components/pages/ContentPage";
import { fetchPublishedEvents, type IndustryEvent } from "@/lib/api";

function formatEventRange(startsOn: string, endsOn: string | null) {
  const start = new Date(startsOn);
  const end = endsOn ? new Date(endsOn) : null;
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString("en-CA", opts);
  }
  return `${start.toLocaleDateString("en-CA", opts)} – ${end.toLocaleDateString("en-CA", opts)}`;
}

export default function EventCalendarList() {
  const [events, setEvents] = useState<IndustryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchPublishedEvents();
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) setError("Unable to load the event calendar right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ContentSection
      title="Facility management events & exhibitions"
      description="Industry conferences, expos, and forums curated for CAISBE members—including listings drawn from major FM calendars and industry reports. Admins can publish additional events from the CAISBE admin console."
      wide
    >
      {loading ? (
        <p className="text-sm text-caisbe-muted">Loading events…</p>
      ) : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {!loading && !error && events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ifma-border bg-[#fafafa] px-6 py-12 text-center">
          <p className="text-base leading-7 text-caisbe-muted">
            No published events yet. Check back soon, or contact CAISBE to
            suggest an industry listing.
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/contact" variant="secondary">
              Contact Us
            </ButtonLink>
          </div>
        </div>
      ) : null}
      {!loading && events.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {events.map((event, index) => (
            <ContentCard
              key={event.id}
              title={event.title}
              meta={`${formatEventRange(event.starts_on, event.ends_on)} · ${event.event_type}${
                event.featured ? " · Featured" : ""
              }`}
              description={event.summary ?? undefined}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <dl className="mt-4 space-y-1 text-sm text-caisbe-muted">
                {event.location ? (
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      Location:{" "}
                    </dt>
                    <dd className="inline">{event.location}</dd>
                  </div>
                ) : null}
                {event.region ? (
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      Region:{" "}
                    </dt>
                    <dd className="inline">{event.region}</dd>
                  </div>
                ) : null}
                {event.source_name ? (
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      Source:{" "}
                    </dt>
                    <dd className="inline">
                      {event.source_url ? (
                        <a
                          href={event.source_url}
                          target={
                            event.source_url.startsWith("http")
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            event.source_url.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className="font-semibold text-caisbe-red transition-colors hover:text-caisbe-red-dark"
                        >
                          {event.source_name}
                        </a>
                      ) : (
                        event.source_name
                      )}
                    </dd>
                  </div>
                ) : null}
                {event.cpd_hours != null ? (
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      CPD hours:{" "}
                    </dt>
                    <dd className="inline">{event.cpd_hours}</dd>
                  </div>
                ) : null}
              </dl>
              {event.report_file_url ? (
                <a
                  href={event.report_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark"
                >
                  View industry report
                </a>
              ) : null}
            </ContentCard>
          ))}
        </div>
      ) : null}
    </ContentSection>
  );
}
