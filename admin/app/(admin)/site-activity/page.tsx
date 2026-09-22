"use client";

import { useEffect, useState } from "react";
import MetricBars from "@/components/analytics/MetricBars";
import VisitorsByDate from "@/components/analytics/VisitorsByDate";
import VisitTrendChart from "@/components/analytics/VisitTrendChart";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import {
  apiFetch,
  ApiError,
  type SiteVisit,
  type SiteVisitStats,
} from "@/lib/auth";

type RangeId = "7" | "30" | "all";

const RANGES = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "all", label: "All time" },
] as const;

function deltaText(current: number, previous: number | null | undefined): string | null {
  if (previous == null) return null;
  if (previous === 0) return current > 0 ? "New this period" : "No change vs previous period";
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs previous period`;
}

export default function SiteActivityPage() {
  const [range, setRange] = useState<RangeId>("7");
  const [stats, setStats] = useState<SiteVisitStats | null>(null);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [landingOnly, setLandingOnly] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (range !== "all") params.set("days", range);
      if (landingOnly) params.set("landing_only", "true");
      if (country) params.set("country", country);
      const statsQuery = range === "all" ? "" : `?days=${range}`;
      const visitQuery = params.toString() ? `?${params.toString()}` : "";
      try {
        const [statsData, visitData] = await Promise.all([
          apiFetch<SiteVisitStats>(`/admin/site-visits/stats${statsQuery}`),
          apiFetch<SiteVisit[]>(`/admin/site-visits${visitQuery}`),
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
  }, [range, landingOnly, country]);

  const topCountry = stats?.countries[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Site activity"
        description="Public website traffic by day, country, and visitor detail."
      />

      <Tabs items={RANGES} value={range} onChange={setRange} ariaLabel="Date range" />

      {error ? <Alert tone="error" title="Activity could not be loaded">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Views", value: stats?.total_views, delta: deltaText(stats?.total_views ?? 0, stats?.previous_views) },
          { label: "Unique visitors", value: stats?.unique_visitors, delta: deltaText(stats?.unique_visitors ?? 0, stats?.previous_unique) },
          { label: "Landing views", value: stats?.landing_views, delta: null },
          { label: "Top country", value: topCountry?.country ?? "—", delta: topCountry ? `${topCountry.views} views` : null },
        ].map((item) => (
          <Card key={item.label} padding="sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{item.label}</p>
            {loading && !stats ? (
              <Skeleton className="mt-3 h-9 w-24" />
            ) : (
              <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">{item.value ?? 0}</p>
            )}
            {item.delta ? <p className="mt-1 text-xs text-caisbe-muted">{item.delta}</p> : null}
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Views by day</h2>
            <p className="mt-1 text-sm text-caisbe-muted">Hover a point for views and unique visitors.</p>
          </div>
        </div>
        {loading && !stats ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <VisitTrendChart points={stats?.daily ?? []} />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Visitors by country</h2>
            <p className="mt-1 text-xs text-caisbe-muted">Select a country to filter the visitor log.</p>
          </div>
          {loading && !stats ? (
            <div className="space-y-3 p-6"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : (
            <MetricBars
              active={country}
              onSelect={(label) => setCountry((current) => (current === label ? null : label))}
              items={(stats?.countries ?? []).map((row) => ({
                label: row.country,
                views: row.views,
                detail: `${row.views} views · ${row.unique ?? 0} unique`,
              }))}
            />
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Top pages</h2>
          </div>
          {loading && !stats ? (
            <div className="space-y-3 p-6"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : (
            <MetricBars
              items={(stats?.top_paths ?? []).map((row) => ({ label: row.path, views: row.views }))}
            />
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Cities</h2>
            <p className="mt-1 text-xs text-caisbe-muted">From the visitor timezone when a city is not provided.</p>
          </div>
          {loading && !stats ? (
            <div className="space-y-3 p-6"><Skeleton className="h-10" /></div>
          ) : (
            <MetricBars
              items={(stats?.cities ?? []).map((row) => ({
                label: row.label,
                views: row.views,
                detail: `${row.views} views · ${row.unique ?? 0} unique`,
              }))}
            />
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Referrers</h2>
          </div>
          {loading && !stats ? (
            <div className="space-y-3 p-6"><Skeleton className="h-10" /></div>
          ) : (
            <MetricBars
              items={(stats?.referrers ?? []).map((row) => ({
                label: row.label,
                views: row.views,
                detail: `${row.views} · ${row.unique ?? 0} unique`,
              }))}
            />
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Browsers</h2>
          </div>
          {loading && !stats ? (
            <div className="space-y-3 p-6"><Skeleton className="h-10" /></div>
          ) : (
            <MetricBars
              items={(stats?.browsers ?? []).map((row) => ({
                label: row.label,
                views: row.views,
                detail: `${row.views} · ${row.unique ?? 0} unique`,
              }))}
            />
          )}
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Visitors by date</h2>
            <p className="mt-1 text-xs text-caisbe-muted">
              {loading
                ? "Loading…"
                : `${visits.length} visits${country ? ` in ${country}` : ""}`}
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

        {loading ? (
          <Card><Skeleton className="h-24 w-full" /></Card>
        ) : visits.length === 0 ? (
          <Card>
            <EmptyState title="No visits in this range" description="Open the public website to start recording activity." />
          </Card>
        ) : (
          <VisitorsByDate visits={visits} />
        )}
      </section>
    </div>
  );
}
