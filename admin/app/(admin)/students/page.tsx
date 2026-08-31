"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError, type AdminStudent } from "@/lib/auth";

export default function StudentsPage() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<AdminStudent[]>("/admin/students");
        setStudents(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Unable to load students.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      if (student.full_name.toLowerCase().includes(q) || student.email.toLowerCase().includes(q)) {
        return true;
      }
      return student.enrollments.some(
        (enrollment) =>
          enrollment.course_title.toLowerCase().includes(q) ||
          enrollment.course_code.toLowerCase().includes(q),
      );
    });
  }, [students, query]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Students</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          View student accounts and track progress across enrolled courses.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or course"
          className="h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-green sm:max-w-sm"
        />
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <div className="overflow-x-auto border border-ifma-border bg-white">
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">
            {students.length === 0 ? "No students yet." : "No students match your search."}
          </p>
        ) : (
          <table className="min-w-full divide-y divide-ifma-border-light text-left text-sm">
            <thead className="bg-[#fafaf8]">
              <tr>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Student</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Courses &amp; progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {filtered.map((student) => (
                <tr key={student.id} className="align-top">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-caisbe-text">{student.full_name}</p>
                    <p className="mt-0.5 text-xs text-caisbe-muted">{student.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    {student.enrollments.length === 0 ? (
                      <p className="text-sm text-caisbe-muted">No enrollments yet</p>
                    ) : (
                      <ul className="space-y-3">
                        {student.enrollments.map((enrollment) => (
                          <li key={enrollment.course_id} className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/courses/${enrollment.course_id}`}
                                className="font-medium text-caisbe-green hover:text-caisbe-green-mid hover:underline"
                              >
                                {enrollment.course_title}
                              </Link>
                              <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                                {enrollment.course_code}
                              </span>
                              <EnrollmentStatusBadge status={enrollment.status} />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-2 min-w-[120px] flex-1 max-w-xs overflow-hidden rounded-full bg-ifma-border-light">
                                <div
                                  className="h-full rounded-full bg-caisbe-green transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, enrollment.progress))}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs tabular-nums text-caisbe-muted">
                                {enrollment.progress}% complete
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
