"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  ApiError,
  type AdminEnrollment,
  type AdminEnrollmentStats,
} from "@/lib/auth";

type StatusFilter = "all" | "in_progress" | "completed" | "not_started";

function isCompleted(enrollment: AdminEnrollment): boolean {
  return enrollment.status === "completed" || enrollment.progress >= 100;
}

function isInProgress(enrollment: AdminEnrollment): boolean {
  return !isCompleted(enrollment) && enrollment.progress >= 1 && enrollment.progress <= 99;
}

function isNotStarted(enrollment: AdminEnrollment): boolean {
  return !isCompleted(enrollment) && enrollment.progress === 0;
}

function formatEnrolledAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EnrollmentsPage() {
  const [stats, setStats] = useState<AdminEnrollmentStats | null>(null);
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, rosterData] = await Promise.all([
          apiFetch<AdminEnrollmentStats>("/admin/enrollments/stats"),
          apiFetch<AdminEnrollment[]>("/admin/enrollments"),
        ]);
        setStats(statsData);
        setEnrollments(rosterData);
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Unable to load enrollments.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrollments.filter((row) => {
      if (statusFilter === "in_progress" && !isInProgress(row)) return false;
      if (statusFilter === "completed" && !isCompleted(row)) return false;
      if (statusFilter === "not_started" && !isNotStarted(row)) return false;

      if (!q) return true;
      return (
        row.student_name.toLowerCase().includes(q) ||
        row.student_email.toLowerCase().includes(q) ||
        row.course_title.toLowerCase().includes(q) ||
        row.course_code.toLowerCase().includes(q)
      );
    });
  }, [enrollments, query, statusFilter]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Enrollments</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          Platform-wide enrollment activity, course breakdown, and learner progress.
        </p>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total enrollments", value: stats?.total_enrollments },
          { label: "In progress", value: stats?.in_progress },
          { label: "Completed", value: stats?.completed },
          {
            label: "Completion rate",
            value: stats ? `${stats.completion_rate}%` : undefined,
          },
        ].map((item) => (
          <div key={item.label} className="border border-ifma-border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              {item.label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
              {loading ? "—" : (item.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <section className="border border-ifma-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            Enrollments by course
          </h2>
          {!loading && stats ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              New in last 30 days: {stats.new_last_30_days}
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
          ) : !stats || stats.by_course.length === 0 ? (
            <p className="p-6 text-sm text-caisbe-muted">No enrollments yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-ifma-border-light text-left text-sm">
              <thead className="bg-[#fafaf8]">
                <tr>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Course</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Enrolled</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Completed</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Avg progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ifma-border-light">
                {stats.by_course.map((row) => (
                  <tr key={row.course_id}>
                    <td className="px-6 py-4">
                      <Link
                        href={`/courses/${row.course_id}`}
                        className="font-medium text-caisbe-green hover:text-caisbe-green-mid hover:underline"
                      >
                        {row.course_title}
                      </Link>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                        {row.course_code}
                      </p>
                    </td>
                    <td className="px-6 py-4 tabular-nums text-caisbe-text">{row.enrollment_count}</td>
                    <td className="px-6 py-4 tabular-nums text-caisbe-text">{row.completed_count}</td>
                    <td className="px-6 py-4 tabular-nums text-caisbe-text">{row.average_progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            Enrollment roster
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-11 rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-green"
            >
              <option value="all">All statuses</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="not_started">Not started</option>
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student or course"
              className="h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-green sm:max-w-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-ifma-border bg-white">
          {loading ? (
            <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-caisbe-muted">
              {enrollments.length === 0 ? "No enrollments yet." : "No enrollments match your filters."}
            </p>
          ) : (
            <table className="min-w-full divide-y divide-ifma-border-light text-left text-sm">
              <thead className="bg-[#fafaf8]">
                <tr>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Student</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Course</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Status</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Progress</th>
                  <th className="px-6 py-3 font-semibold text-caisbe-text">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ifma-border-light">
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-caisbe-text">{row.student_name}</p>
                      <p className="mt-0.5 text-xs text-caisbe-muted">{row.student_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/courses/${row.course_id}`}
                        className="font-medium text-caisbe-green hover:text-caisbe-green-mid hover:underline"
                      >
                        {row.course_title}
                      </Link>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                        {row.course_code}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <EnrollmentStatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 min-w-[120px] flex-1 max-w-xs overflow-hidden rounded-full bg-ifma-border-light">
                          <div
                            className="h-full rounded-full bg-caisbe-green transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, row.progress))}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-caisbe-muted">
                          {row.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-caisbe-muted">
                      {formatEnrolledAt(row.enrolled_at)}
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

function EnrollmentStatusBadge({ status }: { status: string }) {
  const completed = status === "completed";
  return (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        completed
          ? "bg-caisbe-green/10 text-caisbe-green"
          : "bg-ifma-border-light text-caisbe-muted"
      }`}
    >
      {status}
    </span>
  );
}
