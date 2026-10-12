"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AssignmentReviewForm, { type AssignmentReviewPayload } from "@/components/lms/AssignmentReviewForm";
import Button from "@/components/ui/Button";
import { apiFetch, ApiError, type AdminStudent } from "@/lib/auth";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { resolveUploadUrl } from "@/lib/mediaUrl";

type AssignmentSubmission = {
  id: number;
  assignment_title: string;
  course_code: string;
  course_title: string;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  points_possible: number | null;
  graded_at: string | null;
};

type StudentDocument = {
  id: number;
  label: string;
  file_name: string;
  file_url: string;
  created_at?: string | null;
};

type IntegrityEvent = {
  id: number;
  phase: string;
  event_type: string;
  detail_json?: string | null;
  created_at: string;
  final_exam_id: number;
};

export default function StudentProfilePrintPage() {
  const params = useParams<{ id: string }>();
  const { notice, dialog } = useNoticeDialog();
  const [student, setStudent] = useState<AdminStudent | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);

  useEffect(() => {
    void apiFetch<AdminStudent>(`/admin/students/${params.id}`)
      .then(setStudent)
      .catch((err) => setLoadError(err instanceof ApiError ? err.detail : "Unable to load student."));
    void apiFetch<AssignmentSubmission[]>(`/admin/students/${params.id}/assignment-submissions`)
      .then(setSubmissions)
      .catch(() => setSubmissions([]));
    void apiFetch<StudentDocument[]>(`/admin/students/${params.id}/documents`)
      .then(setDocuments)
      .catch(() => setDocuments([]));
    void apiFetch<IntegrityEvent[]>(`/admin/students/${params.id}/exam-integrity`)
      .then(setIntegrity)
      .catch(() => setIntegrity([]));
  }, [params.id]);

  async function review(id: number, payload: AssignmentReviewPayload) {
    setReviewing(id);
    try {
      const updated = await apiFetch<AssignmentSubmission>(`/admin/assignment-submissions/${id}/review`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSubmissions((current) => current.map((row) => (row.id === id ? updated : row)));
      await notice({
        tone: "success",
        title: "Done",
        description: payload.status === "passed" ? "Submission marked as passed." : "Submission marked as failed.",
      });
    } catch (err) {
      await notice({
        tone: "error",
        title: "Something went wrong",
        description: err instanceof ApiError ? err.detail : "Unable to review the submission.",
      });
    } finally {
      setReviewing(null);
    }
  }

  if (loadError) return <p className="text-sm text-caisbe-red">{loadError}</p>;
  if (!student) return <p className="text-sm text-caisbe-muted">Loading profile…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-8 print:max-w-none">
      {dialog}
      <div className="print:hidden">
        <Button onClick={() => window.print()}>Print profile summary</Button>
      </div>
      <h1 className="font-display text-3xl font-semibold">Student profile</h1>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-caisbe-muted">Name</dt>
          <dd className="font-medium">{student.full_name}</dd>
        </div>
        <div>
          <dt className="text-caisbe-muted">Email</dt>
          <dd>{student.email}</dd>
        </div>
        <div>
          <dt className="text-caisbe-muted">Phone</dt>
          <dd>{student.phone || "—"}</dd>
        </div>
        <div>
          <dt className="text-caisbe-muted">Address</dt>
          <dd>{student.address || "—"}</dd>
        </div>
        <div>
          <dt className="text-caisbe-muted">Location</dt>
          <dd>{[student.city, student.country].filter(Boolean).join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-caisbe-muted">Organization</dt>
          <dd>{student.organization || "—"}</dd>
        </div>
        <div>
          <dt className="text-caisbe-muted">Membership date</dt>
          <dd>
            {student.membership_date ? new Date(student.membership_date).toLocaleDateString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-caisbe-muted">Membership type</dt>
          <dd className="capitalize">{student.membership_type || "—"}</dd>
        </div>
        <div>
          <dt className="text-caisbe-muted">Membership status</dt>
          <dd className="capitalize">{student.membership_status || "pending"}</dd>
        </div>
      </dl>
      <h2 className="font-display text-xl font-semibold">Supporting documents</h2>
      {documents.length === 0 ? (
        <p className="text-sm text-caisbe-muted">No supporting documents attached.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="border border-ifma-border p-3">
              <a
                href={resolveUploadUrl(doc.file_url) ?? doc.file_url}
                className="font-semibold text-caisbe-red underline"
                target="_blank"
                rel="noreferrer"
              >
                {doc.file_name}
              </a>
              <p className="text-caisbe-muted">{doc.label}</p>
            </li>
          ))}
        </ul>
      )}
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
                <a
                  href={resolveUploadUrl(row.file_url) ?? row.file_url}
                  className="font-semibold text-caisbe-red underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.file_name || "Download submission"}
                </a>
              ) : (
                <p className="whitespace-pre-wrap text-caisbe-text">{row.body}</p>
              )}
              <p className="font-semibold capitalize">{row.status.replaceAll("_", " ")}</p>
              {row.points_possible != null && row.score != null ? (
                <p className="text-caisbe-text">
                  Score {row.score} / {row.points_possible}
                </p>
              ) : null}
              {row.feedback ? <p className="whitespace-pre-wrap text-caisbe-text">{row.feedback}</p> : null}
              <div className="print:hidden">
                <AssignmentReviewForm
                  key={`${row.id}-${row.status}-${row.score ?? ""}-${row.graded_at ?? ""}`}
                  pointsPossible={row.points_possible}
                  initialScore={row.score}
                  initialFeedback={row.feedback}
                  busy={reviewing === row.id}
                  onReview={(payload) => void review(row.id, payload)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2 className="font-display text-xl font-semibold">Exam integrity log</h2>
      {integrity.length === 0 ? (
        <p className="text-sm text-caisbe-muted">No secure-exam integrity events recorded.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto text-sm print:max-h-none">
          {integrity.map((row) => (
            <li key={row.id} className="border border-ifma-border px-3 py-2">
              <p className="font-semibold text-caisbe-text">
                {row.event_type.replaceAll("_", " ")} · {row.phase}
              </p>
              <p className="text-caisbe-muted">
                Exam #{row.final_exam_id} · {new Date(row.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
      <h2 className="font-display text-xl font-semibold">Enrollments</h2>
      <ul className="space-y-2 text-sm">
        {student.enrollments.length === 0 ? (
          <li>None</li>
        ) : (
          student.enrollments.map((row) => (
            <li key={row.course_id}>
              {row.course_title} · {row.status.replaceAll("_", " ")} · {row.progress}%
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
