"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EditIconLink } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
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
    <div className="space-y-8">
      {dialog}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">All courses</h1>
          <p className="mt-2 text-sm text-caisbe-muted">
            Browse draft and published courses. Open a course to edit chapters, lessons, and exams.
          </p>
        </div>
        <Link
          href="/courses/new"
          className="inline-flex items-center justify-center border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-green-mid"
        >
          Create course
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["draft", "Draft"],
              ["published", "Published"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                filter === value
                  ? "bg-caisbe-green/10 text-caisbe-green"
                  : "text-caisbe-muted hover:bg-ifma-border-light hover:text-caisbe-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or code"
          className="h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-green sm:max-w-xs"
        />
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <div className="border border-ifma-border bg-white">
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-caisbe-muted">
              {courses.length === 0 ? "No courses yet." : "No courses match your filters."}
            </p>
            {courses.length === 0 ? (
              <Link
                href="/courses/new"
                className="mt-3 inline-flex font-semibold text-caisbe-red hover:text-caisbe-red-dark"
              >
                Create your first course
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {filtered.map((course) => (
              <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                      {course.code}
                    </p>
                    <StatusBadge status={course.status ?? "draft"} />
                  </div>
                  <p className="mt-1 font-semibold text-caisbe-text">{course.title}</p>
                </div>
                <div className="flex items-center gap-1">
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
      </div>
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
