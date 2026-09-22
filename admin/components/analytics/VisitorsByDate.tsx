"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteVisit } from "@/lib/auth";

type CityGroup = {
  city: string;
  visits: SiteVisit[];
};

type CountryGroup = {
  country: string;
  visits: number;
  cities: CityGroup[];
};

type DayGroup = {
  day: string;
  total: number;
  countryCount: number;
  cityCount: number;
  countries: CountryGroup[];
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayHeading(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function browserHint(userAgent: string | null): string {
  if (!userAgent) return "Other";
  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("Chrome/")) return "Chrome";
  if (userAgent.includes("Firefox/")) return "Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) return "Safari";
  return "Other";
}

function cityName(visit: SiteVisit): string {
  return visit.location_city || visit.city || "Unknown";
}

function groupVisits(visits: SiteVisit[]): DayGroup[] {
  const byDate = new Map<string, SiteVisit[]>();
  for (const visit of visits) {
    const day = visit.visited_at.slice(0, 10);
    const list = byDate.get(day) ?? [];
    list.push(visit);
    byDate.set(day, list);
  }

  return [...byDate.entries()].map(([day, rows]) => {
    const byCountry = new Map<string, SiteVisit[]>();
    for (const row of rows) {
      const name = row.location_country || row.country || "Unknown";
      const list = byCountry.get(name) ?? [];
      list.push(row);
      byCountry.set(name, list);
    }

    const countries = [...byCountry.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([country, countryRows]) => {
        const byCity = new Map<string, SiteVisit[]>();
        for (const row of countryRows) {
          const name = cityName(row);
          const list = byCity.get(name) ?? [];
          list.push(row);
          byCity.set(name, list);
        }
        const cities = [...byCity.entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .map(([city, cityRows]) => ({ city, visits: cityRows }));
        return { country, visits: countryRows.length, cities };
      });

    const cityCount = countries.reduce((sum, country) => sum + country.cities.length, 0);
    return {
      day,
      total: rows.length,
      countryCount: countries.length,
      cityCount,
      countries,
    };
  });
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block text-caisbe-muted transition-transform ${open ? "rotate-90" : ""}`}
    >
      ›
    </span>
  );
}

export default function VisitorsByDate({ visits }: { visits: SiteVisit[] }) {
  const days = useMemo(() => groupVisits(visits), [visits]);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [openCity, setOpenCity] = useState<string | null>(null);

  useEffect(() => {
    setOpenDay(days[0]?.day ?? null);
    setOpenCountry(null);
    setOpenCity(null);
  }, [days]);

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayOpen = openDay === day.day;
        const top = day.countries[0]?.visits ?? 1;
        return (
          <section key={day.day} className="overflow-hidden border border-ifma-border bg-admin-surface">
            <button
              type="button"
              aria-expanded={dayOpen}
              onClick={() => {
                setOpenDay(dayOpen ? null : day.day);
                setOpenCountry(null);
                setOpenCity(null);
              }}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-admin-surface-muted/40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Chevron open={dayOpen} />
                <span className="font-display text-base font-semibold text-caisbe-text-dark">
                  {formatDayHeading(day.day)}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                {day.total} visits · {day.countryCount} {day.countryCount === 1 ? "country" : "countries"} · {day.cityCount}{" "}
                {day.cityCount === 1 ? "city" : "cities"}
              </span>
            </button>

            {dayOpen ? (
              <div className="border-t border-ifma-border-light">
                {day.countries.map((country) => {
                  const countryKey = `${day.day}:${country.country}`;
                  const countryOpen = openCountry === countryKey;
                  const width = `${Math.max(4, Math.round((country.visits / top) * 100))}%`;
                  return (
                    <div key={countryKey} className="border-b border-ifma-border-light last:border-b-0">
                      <button
                        type="button"
                        aria-expanded={countryOpen}
                        onClick={() => {
                          setOpenCountry(countryOpen ? null : countryKey);
                          setOpenCity(null);
                        }}
                        className="w-full px-5 py-3 text-left hover:bg-admin-surface-muted/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <Chevron open={countryOpen} />
                            <span className="truncate font-medium text-caisbe-text">{country.country}</span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-caisbe-muted">
                            {country.visits} visits · {country.cities.length}{" "}
                            {country.cities.length === 1 ? "city" : "cities"}
                          </span>
                        </div>
                        <div className="mt-2 ml-5 h-1.5 overflow-hidden rounded-full bg-ifma-border-light">
                          <div className="h-full rounded-full bg-caisbe-red" style={{ width }} />
                        </div>
                      </button>

                      {countryOpen ? (
                        <ul className="border-t border-ifma-border-light bg-admin-surface-muted/30">
                          {country.cities.map((city) => {
                            const cityKey = `${countryKey}:${city.city}`;
                            const cityOpen = openCity === cityKey;
                            return (
                              <li key={cityKey} className="border-b border-ifma-border-light last:border-b-0">
                                <button
                                  type="button"
                                  aria-expanded={cityOpen}
                                  onClick={() => setOpenCity(cityOpen ? null : cityKey)}
                                  className="flex w-full items-center justify-between gap-3 py-2.5 pr-5 pl-12 text-left text-sm hover:bg-admin-surface-muted"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <Chevron open={cityOpen} />
                                    <span className="truncate text-caisbe-text">{city.city}</span>
                                  </span>
                                  <span className="shrink-0 tabular-nums text-caisbe-muted">
                                    {city.visits.length}
                                  </span>
                                </button>
                                {cityOpen ? (
                                  <ul className="divide-y divide-ifma-border-light border-t border-ifma-border-light bg-admin-surface">
                                    {city.visits.map((visit) => (
                                      <li key={visit.id} className="grid gap-1 px-5 py-3 pl-16 text-sm sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
                                        <span className="text-caisbe-muted">{formatWhen(visit.visited_at)}</span>
                                        <span className="min-w-0">
                                          <span className="block truncate font-medium text-caisbe-text">{visit.path}</span>
                                          <span className="mt-0.5 block truncate text-xs text-caisbe-muted">
                                            {visit.referrer || "Direct"} · {browserHint(visit.user_agent)}
                                            {visit.language ? ` · ${visit.language}` : ""}
                                          </span>
                                        </span>
                                        <span className="font-mono text-xs text-caisbe-muted">{visit.ip_address}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
