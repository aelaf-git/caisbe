"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  ApiError,
  type SiteVisit,
  type SiteVisitStats,
} from "@/lib/auth";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function browserHint(userAgent: string | null): string {
  if (!userAgent) return "—";
  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("Chrome/")) return "Chrome";
  if (userAgent.includes("Firefox/")) return "Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) return "Safari";
  return userAgent.slice(0, 48);
}

export default function SiteActivityPage() {
  const [stats, setStats] = useState<SiteVisitStats | null>(null);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [landingOnly, setLandingOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const query = landingOnly ? "?landing_only=true" : "";
        const [statsData, visitData] = await Promise.all([
          apiFetch<SiteVisitStats>("/admin/site-visits/stats"),
          apiFetch<SiteVisit[]>(`/admin/site-visits${query}`),
        ]);
        setStats(statsData);
        setVisits(visitData);
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Unable to load site activity.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [landingOnly]);

  const uniqueAddresses = useMemo(
    () => new Set(visits.map((row) => row.ip_address)).size,
    [visits],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Site activity</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          Visitors on the public website: landing-page traffic, IP addresses, and device details.
        </p>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Landing page views", value: stats?.landing_views },
          { label: "Unique landing visitors", value: stats?.landing_unique_visitors },
          { label: "Views last 7 days", value: stats?.views_last_7_days },
          { label: "Unique last 7 days", value: stats?.unique_last_7_days },
        ].map((item) => (
          <div key={item.label} className="border border-ifma-border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{item.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
              {loading && !stats ? "—" : (item.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-ifma-border bg-white">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Top pages</h2>
          </div>
          {loading && !stats ? (
            <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
          ) : !stats || stats.top_paths.length === 0 ? (
            <p className="p-6 text-sm text-caisbe-muted">No page views recorded yet.</p>
          ) : (
            <ul className="divide-y divide-ifma-border-light">
              {stats.top_paths.map((row) => (
                <li key={row.path} className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
                  <span className="truncate font-medium text-caisbe-text">{row.path}</span>
                  <span className="tabular-nums text-caisbe-muted">{row.views}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-ifma-border bg-white">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Countries</h2>
          </div>
          {loading && !stats ? (
            <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
          ) : !stats || stats.top_countries.length === 0 ? (
            <p className="p-6 text-sm text-caisbe-muted">
              Country appears when the host provides it (for example Cloudflare). IP is always stored.
            </p>
          ) : (
            <ul className="divide-y divide-ifma-border-light">
              {stats.top_countries.map((row) => (
                <li key={row.country} className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
                  <span className="font-medium text-caisbe-text">{row.country}</span>
                  <span className="tabular-nums text-caisbe-muted">{row.views}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Visitor log</h2>
            <p className="mt-1 text-xs text-caisbe-muted">
              {loading ? "Loading…" : `${visits.length} rows · ${uniqueAddresses} unique IP addresses`}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-caisbe-text">
            <input
              type="checkbox"
              checked={landingOnly}
              onChange={(e) => setLandingOnly(e.target.checked)}
              className="size-4 rounded border-ifma-border text-caisbe-green focus:ring-caisbe-green"
            />
            Landing page only
          </label>
        </div>

        <div className="overflow-x-auto border border-ifma-border bg-white">
          {loading ? (
            <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
          ) : visits.length === 0 ? (
            <p className="p-6 text-sm text-caisbe-muted">
              No visits yet. Open the public website to start recording activity.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-ifma-border-light text-left text-sm">
              <thead className="bg-[#fafaf8]">
                <tr>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">When</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Page</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">IP address</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Location</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Referrer</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Browser / language</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ifma-border-light">
                {visits.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-caisbe-muted">
                      {formatWhen(row.visited_at)}
                    </td>
                    <td className="px-6 py-4 font-medium text-caisbe-text">{row.path}</td>
                    <td className="px-6 py-4 font-mono text-xs text-caisbe-text">{row.ip_address}</td>
                    <td className="px-6 py-4 text-caisbe-muted">
                      {[row.city, row.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-caisbe-muted" title={row.referrer ?? undefined}>
                      {row.referrer || "Direct"}
                    </td>
                    <td className="px-6 py-4 text-caisbe-muted">
                      <p>{browserHint(row.user_agent)}</p>
                      <p className="mt-0.5 text-xs">
                        {[row.language, row.timezone].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
