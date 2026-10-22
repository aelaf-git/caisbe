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

type ExamIdentity = {
  session_id: number;
  final_exam_id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  exam_title: string;
  student_full_name: string;
  id_photo_url: string | null;
  face_photo_url: string | null;
  identity_status: string | null;
  identity_reviewed_at: string | null;
  identity_reviewed_by_id: number | null;
  identity_review_note: string | null;
  secure_ok_at: string | null;
};

export default function StudentProfilePrintPage() {
  const params = useParams<{ id: string }>();
  const { notice, dialog } = useNoticeDialog();
  const [student, setStudent] = useState<AdminStudent | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityEvent[]>([]);
  const [identities, setIdentities] = useState<ExamIdentity[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [identityBusy, setIdentityBusy] = useState<number | null>(null);
  const [identityNotes, setIdentityNotes] = useState<Record<number, string>>({});

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
    void apiFetch<ExamIdentity[]>(`/admin/students/${params.id}/exam-identity`)
      .then(setIdentities)
      .catch(() => setIdentities([]));
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

  async function reviewIdentity(sessionId: number, status: "approved" | "rejected") {
    setIdentityBusy(sessionId);
    try {
      const updated = await apiFetch<ExamIdentity>(
        `/admin/students/${params.id}/exam-identity/${sessionId}/review`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            note: (identityNotes[sessionId] || "").trim() || null,
          }),
        },
      );
      setIdentities((current) =>
        current.map((row) => (row.session_id === sessionId ? updated : row)),
      );
      const refreshed = await apiFetch<IntegrityEvent[]>(`/admin/students/${params.id}/exam-integrity`);
      setIntegrity(refreshed);
      await notice({
        tone: "success",
        title: status === "approved" ? "Identity approved" : "Identity rejected",
        description:
          status === "approved"
            ? "The student can start the exam once the secure pre-check is still valid."
            : "The student must capture new photos and run pre-check again.",
      });
    } catch (err) {
      await notice({
        tone: "error",
        title: "Something went wrong",
        description: err instanceof ApiError ? err.detail : "Unable to review identity.",
      });
    } finally {
      setIdentityBusy(null);
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
      <h2 className="font-display text-xl font-semibold">Exam identity verification</h2>
      <p className="text-sm text-caisbe-muted">
        Confirm the name on the photo ID matches the registered name before approving.
      </p>
      {identities.length === 0 ? (
        <p className="text-sm text-caisbe-muted">No exam identity captures yet.</p>
      ) : (
        <ul className="space-y-4">
          {identities.map((row) => {
            const idSrc = resolveUploadUrl(row.id_photo_url);
            const faceSrc = resolveUploadUrl(row.face_photo_url);
            const status = row.identity_status || "pending";
            const busy = identityBusy === row.session_id;
            return (
              <li key={row.session_id} className="space-y-3 border border-ifma-border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-caisbe-text">
                      {row.course_code} · {row.exam_title}
                    </p>
                    <p className="text-caisbe-muted">{row.course_title}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      status === "approved"
                        ? "text-admin-success"
                        : status === "rejected"
                          ? "text-caisbe-red"
                          : "text-caisbe-muted"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-sm text-caisbe-text">
                  Registered name: <span className="font-semibold">{row.student_full_name}</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      Photo ID
                    </p>
                    {idSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={idSrc}
                        alt="Photo ID"
                        className="max-h-56 w-full border border-ifma-border object-contain bg-admin-canvas"
                      />
                    ) : (
                      <p className="text-caisbe-muted">Missing</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      Face photo
                    </p>
                    {faceSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={faceSrc}
                        alt="Face photo"
                        className="max-h-56 w-full border border-ifma-border object-contain bg-admin-canvas"
                      />
                    ) : (
                      <p className="text-caisbe-muted">Missing</p>
                    )}
                  </div>
                </div>
                {row.identity_reviewed_at ? (
                  <p className="text-xs text-caisbe-muted">
                    Reviewed {new Date(row.identity_reviewed_at).toLocaleString()}
                    {row.identity_review_note ? ` · ${row.identity_review_note}` : ""}
                  </p>
                ) : null}
                {status === "pending" || status === "rejected" ? (
                  <div className="print:hidden space-y-2">
                    <textarea
                      className="w-full border border-ifma-border px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Optional note"
                      value={identityNotes[row.session_id] ?? ""}
                      onChange={(event) =>
                        setIdentityNotes((current) => ({
                          ...current,
                          [row.session_id]: event.target.value,
                        }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={busy}
                        onClick={() => void reviewIdentity(row.session_id, "approved")}
                      >
                        {busy ? "Saving…" : "Approve"}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => void reviewIdentity(row.session_id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
                {status === "approved" ? (
                  <div className="print:hidden">
                    <Button
                      disabled={busy}
                      onClick={() => void reviewIdentity(row.session_id, "rejected")}
                    >
                      Revoke / reject
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
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
