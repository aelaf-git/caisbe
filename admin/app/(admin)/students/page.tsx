"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError, type AdminStudent } from "@/lib/auth";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { fieldClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning"
        title="Students"
        description="View student accounts and track progress across enrolled courses."
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-caisbe-muted">
          {loading ? "Loading students…" : `${filtered.length} of ${students.length} students`}
        </p>
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">Search students</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or course"
          className={fieldClassName}
        />
        </label>
      </div>

      {error ? <Alert tone="error" title="Students could not be loaded">{error}</Alert> : null}

      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6" aria-label="Loading students">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={students.length === 0 ? "No students yet" : "No matching students"}
              description={students.length === 0
                ? "Student accounts will appear here after registration."
                : "Try a different name, email address, or course."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full divide-y divide-ifma-border-light text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-caisbe-text sm:px-6">Student</th>
                <th scope="col" className="px-4 py-3 font-semibold text-caisbe-text sm:px-6">Courses &amp; progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {filtered.map((student) => (
                <tr key={student.id} className="align-top transition-colors hover:bg-admin-surface-muted/30">
                  <td className="px-4 py-4 sm:px-6">
                    <p className="font-semibold text-caisbe-text">{student.full_name}</p>
                    <p className="mt-0.5 text-xs text-caisbe-muted">{student.email}</p>
                  </td>
                  <td className="px-4 py-4 sm:px-6">
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
                              <div className="h-2 min-w-[120px] max-w-xs flex-1 overflow-hidden rounded-full bg-ifma-border-light">
                                <div
                                  className="h-full rounded-full bg-caisbe-green transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, enrollment.progress))}%` }}
                                  role="progressbar"
                                  aria-label={`${enrollment.course_title} progress`}
                                  aria-valuenow={enrollment.progress}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
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
          </div>
        )}
      </Card>
    </div>
  );
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const completed = status === "completed";
  return <Badge tone={completed ? "success" : "neutral"}>{status.replaceAll("_", " ")}</Badge>;
}
