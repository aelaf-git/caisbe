"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ApiError, type AdminStudent } from "@/lib/auth";
import Button from "@/components/ui/Button";

type AssignmentSubmission = {
  id: number;
  assignment_title: string;
  course_code: string;
  course_title: string;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
};

export default function StudentProfilePrintPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<AdminStudent | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);

  useEffect(() => {
    void apiFetch<AdminStudent>(`/admin/students/${params.id}`)
      .then(setStudent)
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Unable to load student."));
    void apiFetch<AssignmentSubmission[]>(`/admin/students/${params.id}/assignment-submissions`)
      .then(setSubmissions)
      .catch(() => setSubmissions([]));
  }, [params.id]);

  async function review(id: number, status: "passed" | "failed") {
    setReviewing(id);
    try {
      const updated = await apiFetch<AssignmentSubmission>(`/admin/assignment-submissions/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setSubmissions((current) => current.map((row) => (row.id === id ? updated : row)));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to review the submission.");
    } finally {
      setReviewing(null);
    }
  }

  if (error) return <p className="text-sm text-caisbe-red">{error}</p>;
  if (!student) return <p className="text-sm text-caisbe-muted">Loading profile…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-8 print:max-w-none">
      <div className="print:hidden">
        <Button onClick={() => window.print()}>Print profile summary</Button>
      </div>
      <h1 className="font-display text-3xl font-semibold">Student profile</h1>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-caisbe-muted">Name</dt><dd className="font-medium">{student.full_name}</dd></div>
        <div><dt className="text-caisbe-muted">Email</dt><dd>{student.email}</dd></div>
        <div><dt className="text-caisbe-muted">Phone</dt><dd>{student.phone || "—"}</dd></div>
        <div><dt className="text-caisbe-muted">Address</dt><dd>{student.address || "—"}</dd></div>
        <div><dt className="text-caisbe-muted">Location</dt><dd>{[student.city, student.country].filter(Boolean).join(", ") || "—"}</dd></div>
        <div><dt className="text-caisbe-muted">Organization</dt><dd>{student.organization || "—"}</dd></div>
        <div><dt className="text-caisbe-muted">Membership date</dt><dd>{student.membership_date ? new Date(student.membership_date).toLocaleDateString() : "—"}</dd></div>
        <div><dt className="text-caisbe-muted">Membership type</dt><dd className="capitalize">{student.membership_type || "—"}</dd></div>
        <div><dt className="text-caisbe-muted">Membership status</dt><dd className="capitalize">{student.membership_status || "pending"}</dd></div>
      </dl>
      <h2 className="font-display text-xl font-semibold">Assignment submissions</h2>
      {submissions.length === 0 ? (
        <p className="text-sm text-caisbe-muted">No assignment submissions yet.</p>
      ) : (
        <ul className="space-y-4">
          {submissions.map((row) => (
            <li key={row.id} className="space-y-2 border border-ifma-border p-4 text-sm">
              <p className="font-semibold text-caisbe-text">
                {row.course_code} · {row.assignment_title}
              </p>
              <p className="text-caisbe-muted">{row.course_title}</p>
              {row.file_url ? (
                <a href={row.file_url} className="font-semibold text-caisbe-red underline" target="_blank" rel="noreferrer">
                  {row.file_name || "Download submission"}
                </a>
              ) : (
                <p className="whitespace-pre-wrap text-caisbe-text">{row.body}</p>
              )}
              <p className="font-semibold capitalize">{row.status.replaceAll("_", " ")}</p>
              {row.status === "under_review" ? (
                <div className="flex gap-2 print:hidden">
                  <Button disabled={reviewing === row.id} onClick={() => void review(row.id, "passed")}>
                    Pass
                  </Button>
                  <Button variant="secondary" disabled={reviewing === row.id} onClick={() => void review(row.id, "failed")}>
                    Fail
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <h2 className="font-display text-xl font-semibold">Enrollments</h2>
      <ul className="space-y-2 text-sm">
        {student.enrollments.length === 0 ? <li>None</li> : student.enrollments.map((row) => (
          <li key={row.course_id}>{row.course_title} · {row.status.replaceAll("_", " ")} · {row.progress}%</li>
        ))}
      </ul>
    </div>
  );
}
