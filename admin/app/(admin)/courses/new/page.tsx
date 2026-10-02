"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PassMarkControl from "@/components/lms/PassMarkControl";
import Alert from "@/components/ui/Alert";
import BackButton from "@/components/ui/BackButton";
import Button, { buttonStyles } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
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
    <div className="mx-auto max-w-4xl space-y-7">
      <BackButton href="/courses" label="Back to all courses" />
      <PageHeader
        eyebrow="Courses / New"
        title="Create a course"
        description="Start with the essentials. You’ll add curriculum, assessments, and the certificate in the course workspace."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <form onSubmit={handleCreate}>
        <Card padding="lg" className="space-y-6">
          <div className="border-b border-ifma-border-light pb-5">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Course details</h2>
            <p className="mt-1 text-sm text-caisbe-muted">This information helps learners understand what the course offers.</p>
          </div>
        <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Course code" hint="A short internal identifier, for example FMC.">
            <input
              required
              value={code}
              onChange={(e) => {
                const next = e.target.value;
                setCode(next);
                if (!slugManual) setSlug(slugify(next));
              }}
                className={fieldClassName}
              placeholder="FMC"
            />
            </FormField>
            <FormField label="URL slug" hint="Generated from the course code; you can edit it.">
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
                className={fieldClassName}
              placeholder="auto from code"
            />
            </FormField>
        </div>
          <FormField label="Course title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
              className={fieldClassName}
              placeholder="Certificate in Facility Management"
          />
          </FormField>
          <FormField label="Description" hint="A concise summary shown to prospective learners.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
              className={textAreaClassName}
              placeholder="What will learners gain from this course?"
          />
          </FormField>

          <PassMarkControl
            value={passPercent}
            onChange={setPassPercent}
            onCommit={() => undefined}
            description="Minimum score required to complete the course and earn a certificate."
          />

          <div className="flex flex-wrap justify-end gap-3 border-t border-ifma-border-light pt-5">
          <Link
            href="/courses"
              className={buttonStyles({ variant: "secondary" })}
          >
            Cancel
          </Link>
            <Button
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create course"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
