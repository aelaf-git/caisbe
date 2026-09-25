"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ApiError, type AdminStudent } from "@/lib/auth";
import Button from "@/components/ui/Button";

export default function StudentProfilePrintPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<AdminStudent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<AdminStudent>(`/admin/students/${params.id}`)
      .then(setStudent)
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Unable to load student."));
  }, [params.id]);

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
      <h2 className="font-display text-xl font-semibold">Enrollments</h2>
      <ul className="space-y-2 text-sm">
        {student.enrollments.length === 0 ? <li>None</li> : student.enrollments.map((row) => (
          <li key={row.course_id}>{row.course_title} · {row.status.replaceAll("_", " ")} · {row.progress}%</li>
        ))}
      </ul>
    </div>
  );
}
