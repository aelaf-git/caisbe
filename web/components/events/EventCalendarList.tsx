"use client";

import { useEffect, useState } from "react";
import { ContentCard, ContentSection } from "@/components/pages/ContentPage";
import { fetchPublishedEvents, type IndustryEvent } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n";

const EVENT_TYPE_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    calendar: "Event Calendar",
    expo: "Africa–Canada Built Environment Expo & Forum",
    conferences: "Conferences and Webinars",
  },
  fr: {
    calendar: "Calendrier des événements",
    expo: "Exposition et forum Afrique–Canada sur l’environnement bâti",
    conferences: "Conférences et webinaires",
  },
};

function eventTypeLabel(raw: string, locale: Locale) {
  return EVENT_TYPE_LABELS[locale][raw] ?? raw;
}

function formatEventRange(startsOn: string, endsOn: string | null, locale: Locale) {
  const tag = locale === "fr" ? "fr-CA" : "en-CA";
  const start = new Date(startsOn);
  const end = endsOn ? new Date(endsOn) : null;
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString(tag, opts);
  }
  return `${start.toLocaleDateString(tag, opts)} – ${end.toLocaleDateString(tag, opts)}`;
}

export default function EventCalendarList() {
  const locale = useLocale();
  const fr = locale === "fr";
  const [events, setEvents] = useState<IndustryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchPublishedEvents({ locale });
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) setError(fr ? "Impossible de charger le calendrier des événements pour le moment." : "Unable to load the event calendar right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return (
    <ContentSection
      title={fr ? "Événements et expositions en gestion des installations" : "Facility management events & exhibitions"}
      description={
        fr
          ? "Conférences, expositions et forums de l’industrie sélectionnés et publiés par le CAISBE pour ses membres et l’ensemble de la communauté de la gestion des installations."
          : "Industry conferences, expos, and forums curated and published by CAISBE for members and the wider FM community."
      }
      wide
    >
      {loading ? (
        <p className="text-sm text-caisbe-muted">{fr ? "Chargement des événements…" : "Loading events…"}</p>
      ) : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {!loading && !error && events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ifma-border bg-[#fafafa] px-6 py-12 text-center">
          <p className="text-base leading-7 text-caisbe-muted">
            {fr
              ? "Aucun événement publié pour le moment. Revenez bientôt pour les nouveautés du CAISBE."
              : "No published events yet. Check back soon for updates from CAISBE."}
          </p>
        </div>
      ) : null}
      {!loading && events.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {events.map((event, index) => (
            <ContentCard
              key={event.id}
              title={event.title}
              meta={`${formatEventRange(event.starts_on, event.ends_on, locale)} · ${eventTypeLabel(event.event_type, locale)}${
                event.featured ? (fr ? " · En vedette" : " · Featured") : ""
              }`}
              description={event.summary ?? undefined}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <dl className="mt-4 space-y-1 text-sm text-caisbe-muted">
                {event.location ? (
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      {fr ? "Lieu : " : "Location: "}
                    </dt>
                    <dd className="inline">{event.location}</dd>
                  </div>
                ) : null}
                {event.region ? (
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      {fr ? "Région : " : "Region: "}
                    </dt>
                    <dd className="inline">{event.region}</dd>
                  </div>
                ) : null}
                {event.source_name ? (
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      {fr ? "Source : " : "Source: "}
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
                      {fr ? "Heures de DPC : " : "CPD hours: "}
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
                  {fr ? "Voir le rapport de l’industrie" : "View industry report"}
                </a>
              ) : null}
            </ContentCard>
          ))}
        </div>
      ) : null}
    </ContentSection>
  );
}
