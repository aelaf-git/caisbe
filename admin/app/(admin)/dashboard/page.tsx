"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { buttonStyles } from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { apiFetch, ApiError, type AdminDashboard, type Course } from "@/lib/auth";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [dashboard, courseList] = await Promise.all([
          apiFetch<AdminDashboard>("/admin/dashboard"),
          apiFetch<Course[]>("/admin/courses"),
        ]);
        setData(dashboard);
        setCourses(courseList);
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const value = (n: number | undefined, suffix = "") => `${n ?? 0}${suffix}`;

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Overview"
        title="Welcome back"
        description="Monitor learning activity, keep courses moving, and manage your publishing workflow."
        actions={
          <>
          <Link
            href="/site-activity"
              className={buttonStyles({ variant: "secondary" })}
          >
            Site activity
          </Link>
          <Link
            href="/courses/new"
              className={buttonStyles()}
          >
              <span aria-hidden className="text-lg">+</span>
            Create course
          </Link>
          </>
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active students", value: data?.students, note: "Learner accounts", href: "/students" },
          { label: "Enrollments", value: data?.total_enrollments, note: `${data?.enrollments_in_progress ?? 0} in progress`, href: "/enrollments" },
          { label: "Published courses", value: data?.courses_published, note: `${data?.courses_draft ?? 0} drafts`, href: "/courses" },
          { label: "Completion rate", value: data?.completion_rate, suffix: "%", note: `${data?.enrollments_completed ?? 0} completed`, href: "/reports" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="group">
            <Card className="h-full transition-colors group-hover:border-caisbe-red">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-caisbe-muted">{item.label}</p>
                <span className="h-2 w-2 rounded-full bg-caisbe-red/70" />
              </div>
              <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-caisbe-text-dark">
                {value(item.value, item.suffix)}
              </p>
              <p className="mt-1 text-xs text-caisbe-muted">{item.note}</p>
            </Card>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ifma-border px-5 py-4 md:px-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Course workspace</h2>
              <p className="mt-1 text-xs text-caisbe-muted">Continue building and publishing your programs.</p>
            </div>
            <Link href="/courses" className="text-sm font-semibold text-caisbe-red hover:underline">
              View all
            </Link>
          </div>
          {courses.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Create your first course"
                description="Set up course details, chapters, assessments, and certificates in one workspace."
                action={<Link href="/courses/new" className={buttonStyles()}>Create course</Link>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-ifma-border-light">
              {courses.slice(0, 6).map((course) => {
                const published = (course.status ?? "draft") === "published";
                return (
                  <li key={course.id}>
                    <Link
                      href={`/courses/${course.id}`}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ifma-border-light/60 md:px-6"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-caisbe-red/10 text-xs font-bold text-caisbe-red">
                        {course.code.slice(0, 4)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-caisbe-text group-hover:text-caisbe-red">{course.title}</p>
                        <p className="mt-1 text-xs text-caisbe-muted">Course code: {course.code}</p>
                      </div>
                      <Badge tone={published ? "success" : "warning"}>{published ? "Published" : "Draft"}</Badge>
                      <span aria-hidden className="text-lg text-caisbe-muted">›</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Learning progress</h2>
            <p className="mt-1 text-xs text-caisbe-muted">Enrollment outcomes across all courses.</p>
            <div className="mt-6 flex items-end justify-between gap-4">
              <span className="font-display text-4xl font-semibold text-caisbe-text-dark">{value(data?.completion_rate, "%")}</span>
              <span className="text-xs font-medium text-caisbe-muted">completion rate</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-admin-surface-muted">
              <div className="h-full rounded-full bg-caisbe-red" style={{ width: `${Math.min(100, data?.completion_rate ?? 0)}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ifma-border-light pt-5">
              <div><p className="text-xl font-semibold text-caisbe-text-dark">{value(data?.enrollments_in_progress)}</p><p className="text-xs text-caisbe-muted">In progress</p></div>
              <div><p className="text-xl font-semibold text-caisbe-text-dark">{value(data?.enrollments_completed)}</p><p className="text-xs text-caisbe-muted">Completed</p></div>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Publishing snapshot</h2>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Magazine issues", data?.magazines_published],
                ["Newsletter subscribers", data?.newsletter_subscribers],
                ["Newsletters sent", data?.newsletters_sent],
                ["Site views today", data?.site_views_today],
              ].map(([label, count]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4">
                  <span className="text-caisbe-muted">{label}</span>
                  <span className="font-semibold tabular-nums text-caisbe-text">{count ?? 0}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
