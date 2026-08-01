"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError, type Course } from "@/lib/auth";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<Course>("/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          code,
          title,
          description,
          slug: slug || slugify(title),
          pass_percent: 70,
        }),
      });
      setCode("");
      setTitle("");
      setDescription("");
      setSlug("");
      setCourses((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to create course.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-green">Courses</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          Create draft courses, build chapters and lessons, then publish them to the student portal.
        </p>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <form onSubmit={handleCreate} className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Create course</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Code</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
              placeholder="FMC"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
              placeholder="auto from title"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-ifma-border px-3 py-2 text-sm outline-none focus:border-caisbe-green"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-green-mid disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create course"}
        </button>
      </form>

      <div className="border border-ifma-border bg-white">
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : courses.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">No courses yet. Create your first course above.</p>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {courses.map((course) => (
              <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                    {course.code} · {course.status ?? "draft"}
                  </p>
                  <p className="mt-1 font-semibold text-caisbe-text">{course.title}</p>
                </div>
                <Link
                  href={`/courses/${course.id}`}
                  className="text-sm font-semibold uppercase tracking-wide text-caisbe-green hover:text-caisbe-red"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
