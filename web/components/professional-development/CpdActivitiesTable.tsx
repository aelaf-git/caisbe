"use client";

import { useEffect, useState } from "react";
import { ContentSection } from "@/components/pages/ContentPage";
import { fetchPublishedCpdActivities, type CpdActivity } from "@/lib/api";

export default function CpdActivitiesTable() {
  const [rows, setRows] = useState<CpdActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchPublishedCpdActivities();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError("Unable to load CPD activities right now.");
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
      title="CPD activity"
      description="Continuing professional development hours for CAISBE courses, seminars, and qualifying events. Hours reported and approved are maintained by the institute."
      wide
    >
      {loading ? (
        <p className="text-sm text-caisbe-muted">Loading CPD activities…</p>
      ) : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {!loading && !error ? (
        <div className="overflow-x-auto rounded-lg border border-ifma-border-light">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#fafafa] text-xs font-semibold uppercase tracking-[0.14em] text-caisbe-muted">
              <tr>
                <th className="px-5 py-4">CPD activity</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">CPD hours reported</th>
                <th className="px-5 py-4">CPD hours approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light bg-white">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-caisbe-muted"
                  >
                    CPD activities will appear here once published.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-4 font-medium text-caisbe-text-dark">
                      {row.activity}
                    </td>
                    <td className="px-5 py-4 capitalize text-caisbe-muted">
                      {row.category}
                    </td>
                    <td className="px-5 py-4 text-caisbe-text">
                      {row.hours_reported}
                    </td>
                    <td className="px-5 py-4 text-caisbe-text">
                      {row.hours_approved}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </ContentSection>
  );
}
