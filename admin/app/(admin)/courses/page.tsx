"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { EditIconLink } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { apiFetch, ApiError, type Course } from "@/lib/auth";

type Filter = "all" | "draft" | "published";

export default function AdminCoursesPage() {
  const { confirm, dialog } = useConfirmDialog();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<Course[]>("/admin/courses");
        setCourses(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Unable to load courses.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      const status = course.status ?? "draft";
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        course.slug.toLowerCase().includes(q)
      );
    });
  }, [courses, filter, query]);

  async function handleDelete(course: Course) {
    const ok = await confirm({
      title: "Delete course?",
      description: `Delete “${course.title}”? This cannot be undone.`,
      confirmLabel: "Delete course",
    });
    if (!ok) return;
    setDeletingId(course.id);
    setError(null);
    try {
      await apiFetch(`/admin/courses/${course.id}`, { method: "DELETE" });
      setCourses((prev) => prev.filter((item) => item.id !== course.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to delete course.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-7">
      {dialog}
      <PageHeader
        eyebrow="Learning content"
        title="Courses"
        description="Create, organize, and publish learning experiences from one workspace."
        actions={
          <Link href="/courses/new" className={buttonStyles()}>
            <span aria-hidden className="text-lg">+</span>
            Create course
          </Link>
        }
      />

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-ifma-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <Tabs
            ariaLabel="Course status"
            value={filter}
            onChange={setFilter}
            items={[
              { id: "all", label: "All", count: courses.length },
              { id: "draft", label: "Draft", count: courses.filter((course) => (course.status ?? "draft") === "draft").length },
              { id: "published", label: "Published", count: courses.filter((course) => course.status === "published").length },
            ]}
          />
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">Search courses</span>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-caisbe-muted">⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or code"
              className="h-10 w-full rounded-lg border border-ifma-border bg-admin-surface pr-3 pl-9 text-sm outline-none focus:border-caisbe-red focus:ring-4 focus:ring-caisbe-red/10"
        />
          </label>
      </div>

        {error ? <div className="p-5 md:p-6"><Alert tone="error">{error}</Alert></div> : null}
        {loading ? (
          <div className="space-y-3 p-5 md:p-6">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5 md:p-6">
            <EmptyState
              title={courses.length === 0 ? "Create your first course" : "No matching courses"}
              description={courses.length === 0 ? "Start with course details, then add chapters, assessments, and a certificate." : "Try another search term or change the status filter."}
              action={courses.length === 0 ? <Link href="/courses/new" className={buttonStyles()}>Create course</Link> : undefined}
            />
          </div>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {filtered.map((course) => (
              <li key={course.id} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-admin-surface-muted/60 md:px-6">
                <span className="relative h-14 w-20 shrink-0 overflow-hidden border border-ifma-border-light bg-[#f3f0ec]">
                  {course.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wide text-caisbe-red">
                      {course.code.slice(0, 4)}
                    </span>
                  )}
                </span>
                <Link href={`/courses/${course.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="truncate font-semibold text-caisbe-text group-hover:text-caisbe-red">{course.title}</p>
                    <StatusBadge status={course.status ?? "draft"} />
                    {course.has_unpublished_changes ? (
                      <Badge tone="warning">Unsaved publish</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-caisbe-muted">{course.code} · /{course.slug}</p>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <EditIconLink href={`/courses/${course.id}`} label={`Edit ${course.title}`} />
                  <DeleteIconButton
                    label={deletingId === course.id ? "Deleting course…" : `Delete ${course.title}`}
                    disabled={deletingId === course.id}
                    onClick={() => void handleDelete(course)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const published = status === "published";
  return (
    <Badge tone={published ? "success" : "warning"}>
      {status}
    </Badge>
  );
}
