"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError, type AdminDashboard } from "@/lib/auth";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setData(await apiFetch<AdminDashboard>("/admin/dashboard"));
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const value = (n: number | undefined) => (loading ? "—" : (n ?? 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Dashboard</h1>
          <p className="mt-2 text-sm text-caisbe-muted">
            A snapshot of LMS activity, publishing, and landing-page visits.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/site-activity"
            className="inline-flex items-center justify-center border-2 border-ifma-border bg-white px-5 py-3 text-sm font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-green hover:text-caisbe-green"
          >
            Site activity
          </Link>
          <Link
            href="/courses/new"
            className="inline-flex items-center justify-center border-2 border-caisbe-green bg-caisbe-green px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-green-mid"
          >
            Create course
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-caisbe-muted">
          Landing page
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Landing visits", value: data?.landing_views, href: "/site-activity" },
            { label: "Unique landing visitors", value: data?.landing_unique_visitors, href: "/site-activity" },
            { label: "Site views today", value: data?.site_views_today, href: "/site-activity" },
            { label: "Unique visitors today", value: data?.site_unique_today, href: "/site-activity" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="border border-ifma-border bg-white p-5 hover:border-caisbe-green">
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{item.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
                {value(item.value)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-caisbe-muted">
          Learning activity
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Students", value: data?.students, href: "/students" },
            { label: "Enrollments", value: data?.total_enrollments, href: "/enrollments" },
            { label: "In progress", value: data?.enrollments_in_progress, href: "/enrollments" },
            { label: "Completed", value: data?.enrollments_completed, href: "/enrollments" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="border border-ifma-border bg-white p-5 hover:border-caisbe-green">
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{item.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
                {value(item.value)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-caisbe-muted">
          Content & outreach
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Published courses", value: data?.courses_published, href: "/courses" },
            { label: "Draft courses", value: data?.courses_draft, href: "/courses" },
            { label: "Certificates issued", value: data?.certificates, href: "/enrollments" },
            { label: "Completion rate", value: data?.completion_rate, suffix: "%", href: "/enrollments" },
            { label: "Magazine issues", value: data?.magazines_published, href: "/media" },
            { label: "Newsletter subscribers", value: data?.newsletter_subscribers, href: "/media" },
            { label: "Newsletters sent", value: data?.newsletters_sent, href: "/media" },
            { label: "Total courses", value: data?.courses_total, href: "/courses" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="border border-ifma-border bg-white p-5 hover:border-caisbe-green">
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{item.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
                {loading ? "—" : `${item.value ?? 0}${item.suffix ?? ""}`}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
