"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError, type Course } from "@/lib/auth";
import { slugify } from "@/lib/ordinalTitles";

export default function AdminCreateCoursePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [passPercent, setPassPercent] = useState(70);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          slug: slug || slugify(code),
          pass_percent: passPercent,
        }),
      });
      router.replace(`/courses/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to create course.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
          <Link href="/courses" className="hover:text-caisbe-green">
            Courses
          </Link>{" "}
          / Create
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">Create course</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          Add a draft course. You can build chapters, lessons, and exams after it is created.
        </p>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <form onSubmit={handleCreate} className="space-y-4 border border-ifma-border bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Code</label>
            <input
              required
              value={code}
              onChange={(e) => {
                const next = e.target.value;
                setCode(next);
                if (!slugManual) setSlug(slugify(next));
              }}
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
              placeholder="FMC"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
              placeholder="auto from code"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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

        <div className="rounded-md border border-ifma-border-light bg-[#fafaf8] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-caisbe-text">Pass mark</p>
              <p className="mt-1 text-xs text-caisbe-muted">
                Minimum score required to complete the course and earn a certificate.
              </p>
            </div>
            <div className="flex items-baseline gap-1 text-caisbe-green">
              <span className="font-display text-3xl font-semibold tabular-nums leading-none">
                {passPercent}
              </span>
              <span className="text-sm font-semibold">%</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={passPercent}
              onChange={(e) => setPassPercent(Number(e.target.value))}
              className="h-2 min-w-[180px] flex-1 cursor-pointer appearance-none rounded-full bg-ifma-border accent-caisbe-green"
              aria-label="Pass percent"
            />
            <label className="relative block w-24 shrink-0">
              <span className="sr-only">Pass percent</span>
              <input
                type="number"
                min={0}
                max={100}
                value={passPercent}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setPassPercent(Number.isFinite(next) ? Math.min(100, Math.max(0, next)) : 0);
                }}
                className="h-11 w-full rounded-md border border-ifma-border bg-white pr-8 pl-3 text-sm tabular-nums outline-none focus:border-caisbe-green"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-caisbe-muted">
                %
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-green-mid disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create course"}
          </button>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center border-2 border-ifma-border bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-green hover:text-caisbe-green"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
