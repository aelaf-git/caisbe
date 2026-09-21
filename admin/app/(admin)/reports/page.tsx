"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";

type CourseReportRow = {
  course_id: number;
  course_code: string;
  course_title: string;
  enrollments: number;
  completed: number;
  completion_percent: number;
  certificates_issued: number;
};

type AdminReports = {
  students: number;
  total_enrollments: number;
  enrollments_completed: number;
  enrollments_in_progress: number;
  completion_rate: number;
  membership_certificates: number;
  completion_certificates: number;
  quiz_attempts: number;
  quiz_passed: number;
  courses: CourseReportRow[];
};

export default function ReportsPage() {
  const [data, setData] = useState<AdminReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const reports = await apiFetch<AdminReports>("/admin/reports");
        if (active) setData(reports);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load reports.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const value = (n: number | undefined, suffix = "") =>
    loading ? "—" : `${n ?? 0}${suffix}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Reports</h1>
          <p className="mt-2 text-sm text-caisbe-muted">
            Enrollment, completion, and certificate activity across the LMS.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-caisbe-green hover:underline"
        >
          Back to dashboard
        </Link>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Students", display: value(data?.students) },
          { label: "Enrollments", display: value(data?.total_enrollments) },
          { label: "Completed", display: value(data?.enrollments_completed) },
          { label: "In progress", display: value(data?.enrollments_in_progress) },
          { label: "Completion rate", display: value(data?.completion_rate, "%") },
          { label: "Membership certificates", display: value(data?.membership_certificates) },
          { label: "Completion certificates", display: value(data?.completion_certificates) },
          {
            label: "Quiz pass rate",
            display: value(
              data && data.quiz_attempts
                ? Math.round((100 * data.quiz_passed) / data.quiz_attempts)
                : 0,
              "%",
            ),
            sub: data ? `${data.quiz_passed}/${data.quiz_attempts} passed` : undefined,
          },
        ].map((item) => (
          <div key={item.label} className="border border-ifma-border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              {item.label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
              {item.display}
            </p>
            {"sub" in item && item.sub ? (
              <p className="mt-1 text-xs text-caisbe-muted">{item.sub}</p>
            ) : null}
          </div>
        ))}
      </div>

      <section className="border border-ifma-border bg-white">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">By course</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : !data || data.courses.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">No courses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-ifma-border-light bg-[#fafafa] text-xs uppercase tracking-wide text-caisbe-muted">
                <tr>
                  <th className="px-6 py-3 font-semibold">Code</th>
                  <th className="px-6 py-3 font-semibold">Course</th>
                  <th className="px-6 py-3 font-semibold">Enrollments</th>
                  <th className="px-6 py-3 font-semibold">Completed</th>
                  <th className="px-6 py-3 font-semibold">Completion %</th>
                  <th className="px-6 py-3 font-semibold">Certificates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ifma-border-light">
                {data.courses.map((row) => (
                  <tr key={row.course_id}>
                    <td className="px-6 py-3 font-mono text-xs text-caisbe-muted">{row.course_code}</td>
                    <td className="px-6 py-3 font-medium text-caisbe-text">{row.course_title}</td>
                    <td className="px-6 py-3 tabular-nums">{row.enrollments}</td>
                    <td className="px-6 py-3 tabular-nums">{row.completed}</td>
                    <td className="px-6 py-3 tabular-nums">{row.completion_percent}%</td>
                    <td className="px-6 py-3 tabular-nums">{row.certificates_issued}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
