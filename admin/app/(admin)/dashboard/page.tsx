"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EditIconLink } from "@/components/ui/IconPencil";
import { apiFetch, ApiError, type Course } from "@/lib/auth";

export default function AdminDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<Course[]>("/admin/courses");
        setCourses(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const stats = useMemo(() => {
    const draft = courses.filter((c) => (c.status ?? "draft") === "draft").length;
    const published = courses.filter((c) => c.status === "published").length;
    return { total: courses.length, draft, published };
  }, [courses]);

  const recent = courses.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Dashboard</h1>
          <p className="mt-2 text-sm text-caisbe-muted">
            Track course drafts, publish progress, and jump back into authoring.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/courses"
            className="inline-flex items-center justify-center border-2 border-ifma-border bg-white px-5 py-3 text-sm font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-green hover:text-caisbe-green"
          >
            View all courses
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

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total courses", value: stats.total },
          { label: "Drafts", value: stats.draft },
          { label: "Published", value: stats.published },
        ].map((item) => (
          <div key={item.label} className="border border-ifma-border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{item.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
              {loading ? "—" : item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="border border-ifma-border bg-white">
        <div className="flex items-center justify-between border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">Recent courses</h2>
          <Link href="/courses" className="text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark">
            See all
          </Link>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-caisbe-muted">No courses yet.</p>
            <Link
              href="/courses/new"
              className="mt-3 inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
            >
              Create your first course
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {recent.map((course) => (
              <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{course.code}</p>
                    <StatusBadge status={course.status ?? "draft"} />
                  </div>
                  <p className="mt-1 font-semibold text-caisbe-text">{course.title}</p>
                </div>
                <EditIconLink href={`/courses/${course.id}`} label={`Edit ${course.title}`} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-caisbe-muted">
        More admin tools (students, enrollments, media, reports) are coming soon.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        published
          ? "bg-caisbe-green/10 text-caisbe-green"
          : "bg-ifma-border-light text-caisbe-muted"
      }`}
    >
      {status}
    </span>
  );
}
