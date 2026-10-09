"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError, type Enrollment } from "@/lib/auth";
import { formatDate, membershipTypeLabel } from "@/lib/commerce";
import type { Certificate } from "@/lib/lms";

function UnreadNotificationsBanner() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    void apiFetch<{ unread_count: number }>("/me/notifications")
      .then((data) => {
        if (active) setUnread(data.unread_count);
      })
      .catch(() => {
        if (active) setUnread(0);
      });
    return () => {
      active = false;
    };
  }, []);

  if (unread <= 0) return null;

  return (
    <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-text">
      You have {unread} unread notification{unread === 1 ? "" : "s"}.{" "}
      <Link href="/notifications" className="font-semibold text-caisbe-red hover:underline">
        View notifications
      </Link>
    </div>
  );
}

type AssignmentSummary = {
  block_id: number;
  title: string;
  course_code: string;
  due_at: string | null;
  bucket: "pending" | "submitted" | "evaluated";
};

function formatDue(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleString();
}

function isOverdue(row: AssignmentSummary) {
  if (row.bucket !== "pending" || !row.due_at) return false;
  const due = new Date(row.due_at).getTime();
  return !Number.isNaN(due) && due < Date.now();
}

function MyAssignmentsCard() {
  const [rows, setRows] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<AssignmentSummary[]>("/me/assignments")
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load assignments.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = {
    pending: rows.filter((row) => row.bucket === "pending").length,
    submitted: rows.filter((row) => row.bucket === "submitted").length,
    evaluated: rows.filter((row) => row.bucket === "evaluated").length,
  };
  const upcoming = [...rows]
    .filter((row) => row.due_at)
    .sort((a, b) => {
      const pendingFirst = Number(a.bucket !== "pending") - Number(b.bucket !== "pending");
      if (pendingFirst !== 0) return pendingFirst;
      return new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime();
    })
    .slice(0, 4);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">My Assignments</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-caisbe-muted">
            Due dates, coursework to submit, and grades after your instructor reviews the work.
          </p>
        </div>
        <Link href="/assignments" className="text-sm font-semibold text-caisbe-red hover:underline">
          Open My Assignments
        </Link>
      </div>
      {error ? <p className="mt-4 text-sm text-caisbe-red">{error}</p> : null}
      {loading ? (
        <p className="mt-4 text-sm text-caisbe-muted">Loading assignments…</p>
      ) : (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Pending", value: counts.pending },
              { label: "Under review", value: counts.submitted },
              { label: "Evaluated", value: counts.evaluated },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-ifma-border-light bg-admin-surface-muted/50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-caisbe-muted">{item.label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment due dates</h3>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-caisbe-muted">
                {rows.length === 0
                  ? "Assignments from your courses will show up here."
                  : "None of your assignments have a due date."}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {upcoming.map((row) => (
                  <li key={row.block_id}>
                    <Link
                      href={`/assignments?block=${row.block_id}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-ifma-border-light px-4 py-3 text-sm hover:border-caisbe-red"
                    >
                      <span>
                        <span className="font-semibold text-caisbe-text">{row.title}</span>
                        <span className="mt-0.5 block text-caisbe-muted">{row.course_code}</span>
                      </span>
                      <span className={isOverdue(row) ? "font-semibold text-caisbe-red" : "text-caisbe-text"}>
                        {formatDue(row.due_at)}
                        {isOverdue(row) ? <span className="mt-0.5 block text-xs uppercase tracking-wide">Overdue</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function countProgress(done: number, total: number) {
  if (total <= 0) return "None in this course";
  const percent = Math.round((100 * done) / total);
  return `${percent}% (${done} of ${total})`;
}

function examStatus(enrollment: Enrollment) {
  if (!enrollment.has_final_exam) return "No exam";
  if (enrollment.topics_completed === enrollment.topics_total) return "Eligible";
  return "Not eligible";
}

function outstandingLines(enrollment: Enrollment) {
  const lines: string[] = [];
  if (enrollment.status === "pending_payment") lines.push("Complete payment");
  const topicsLeft = Math.max(0, enrollment.topics_total - enrollment.topics_completed);
  const quizzesLeft = Math.max(0, enrollment.quizzes_total - enrollment.quizzes_completed);
  const assignmentsLeft = Math.max(0, enrollment.assignments_total - enrollment.assignments_completed);
  if (topicsLeft > 0) lines.push(`${topicsLeft} topic${topicsLeft === 1 ? "" : "s"} remaining`);
  if (quizzesLeft > 0) lines.push(`${quizzesLeft} quiz${quizzesLeft === 1 ? "" : "zes"} remaining`);
  if (assignmentsLeft > 0) {
    lines.push(`${assignmentsLeft} assignment${assignmentsLeft === 1 ? "" : "s"} remaining`);
  }
  if (
    enrollment.has_final_exam &&
    enrollment.topics_completed === enrollment.topics_total &&
    !enrollment.exam_passed
  ) {
    lines.push("Pass the final exam");
  }
  return lines;
}

function MyProgressSection({ enrollments }: { enrollments: Enrollment[] }) {
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">My Progress</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-caisbe-muted">
        Course progress, learning, assignments, exam eligibility, and certificates for each course.
      </p>
      {enrollments.length === 0 ? (
        <p className="mt-4 text-sm text-caisbe-muted">
          Enroll in a course to see your progress.{" "}
          <Link href="/courses" className="font-semibold text-caisbe-red hover:underline">
            Browse courses
          </Link>
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {enrollments.map((enrollment) => {
            const exam = examStatus(enrollment);
            const outstanding = outstandingLines(enrollment);
            const issued = Boolean(enrollment.certificate_code);
            return (
              <li key={enrollment.id} className="rounded-md border border-ifma-border-light px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    href={`/courses/${enrollment.course.id}`}
                    className="font-display text-base font-semibold text-caisbe-text-dark hover:text-caisbe-red"
                  >
                    {enrollment.course.title}
                  </Link>
                  <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                    {enrollment.course.code}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Course progress</dt>
                    <dd className="mt-1 text-sm font-semibold text-caisbe-text">{enrollment.progress}%</dd>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-admin-surface-muted">
                      <div
                        className="h-full bg-caisbe-red"
                        style={{ width: `${Math.min(100, Math.max(0, enrollment.progress))}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Learning progress</dt>
                    <dd className="mt-1 text-sm font-semibold text-caisbe-text">
                      {countProgress(
                        enrollment.topics_completed + enrollment.quizzes_completed,
                        enrollment.topics_total + enrollment.quizzes_total,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment progress</dt>
                    <dd className="mt-1 text-sm font-semibold text-caisbe-text">
                      {countProgress(enrollment.assignments_completed, enrollment.assignments_total)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Exam status</dt>
                    <dd
                      className={`mt-1 text-sm font-semibold ${
                        exam === "Eligible"
                          ? "text-admin-success"
                          : exam === "Not eligible"
                            ? "text-caisbe-red"
                            : "text-caisbe-muted"
                      }`}
                    >
                      {exam}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      Outstanding requirements
                    </dt>
                    <dd className="mt-1 text-sm text-caisbe-text">
                      {outstanding.length === 0 ? (
                        "None"
                      ) : (
                        <ul className="space-y-1">
                          {outstanding.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      Certification status
                    </dt>
                    <dd className={`mt-1 text-sm font-semibold ${issued ? "text-admin-success" : "text-caisbe-text"}`}>
                      {issued ? "Issued" : "Under progress"}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const TABS = [
  { id: "current", label: "Current" },
  { id: "completed", label: "Completed" },
  { id: "submission", label: "Submission" },
  { id: "credentials", label: "Credentials" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("current");

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [enrollmentData, certData] = await Promise.all([
          apiFetch<Enrollment[]>("/me/enrollments"),
          apiFetch<Certificate[]>("/me/certificates"),
        ]);
        if (!active) return;
        setEnrollments(enrollmentData);
        setCertificates(certData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.detail : "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  const current = enrollments.filter((item) => item.status === "enrolled" || item.status === "pending_payment");
  const completed = enrollments.filter((item) => item.status === "completed");
  const submission = enrollments.filter(
    (item) => item.status === "enrolled" && !item.exam_passed && !item.certificate_code,
  );
  const pendingPay = enrollments.filter((item) => item.status === "pending_payment").length;

  const rows = useMemo(() => {
    if (tab === "current") return current;
    if (tab === "completed") return completed;
    if (tab === "submission") return submission;
    return [];
  }, [tab, current, completed, submission]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="myCAISBE"
        title="Dashboard"
        description={`Welcome back, ${user?.full_name}. Track your courses, submissions, and credentials.`}
        actions={
          <Link
            href="/courses"
            className="inline-flex h-11 items-center rounded-full bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
          >
            Browse courses
          </Link>
        }
      />

      {error ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </div>
      ) : null}

      <UnreadNotificationsBanner />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Student User Guide</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-caisbe-muted">
              How myCAISBE works today: register, buy a course, study, submit assignments, take exams,
              download certificates, and open a ticket.
            </p>
          </div>
          <Link href="/guide" className="text-sm font-semibold text-caisbe-red hover:underline">
            Open user guide
          </Link>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Discussion forum</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-caisbe-muted">
              Read and join student discussions on courses, careers, mentorship, and events. You are
              signed in, so you can take part from here.
            </p>
          </div>
          <Link href="/forum" className="text-sm font-semibold text-caisbe-red hover:underline">
            Open forum
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "In progress", value: current.filter((item) => item.status === "enrolled").length },
          { label: "Awaiting payment", value: pendingPay },
          { label: "Completed", value: completed.length },
          { label: "Credentials", value: certificates.length },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-caisbe-muted">{stat.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">{stat.value}</p>
          </Card>
        ))}
      </div>

      <MyAssignmentsCard />

      <MyProgressSection enrollments={enrollments} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Student profile</h2>
            <p className="mt-1 text-sm text-caisbe-muted">Membership details used for certificates and receipts.</p>
          </div>
          <Link href="/account" className="text-sm font-semibold text-caisbe-red hover:underline">
            Manage your profile
          </Link>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-md border border-ifma-border-light bg-admin-surface-muted/50 px-4 py-3">
            <dt className="text-caisbe-muted">Name</dt>
            <dd className="mt-1 font-medium text-caisbe-text">{user?.full_name}</dd>
          </div>
          <div className="rounded-md border border-ifma-border-light bg-admin-surface-muted/50 px-4 py-3">
            <dt className="text-caisbe-muted">Email</dt>
            <dd className="mt-1 font-medium text-caisbe-text">{user?.email}</dd>
          </div>
          <div className="rounded-md border border-ifma-border-light bg-admin-surface-muted/50 px-4 py-3">
            <dt className="text-caisbe-muted">Phone</dt>
            <dd className="mt-1 font-medium text-caisbe-text">{user?.phone || "—"}</dd>
          </div>
          <div className="rounded-md border border-ifma-border-light bg-admin-surface-muted/50 px-4 py-3">
            <dt className="text-caisbe-muted">Location</dt>
            <dd className="mt-1 font-medium text-caisbe-text">
              {[user?.city, user?.country].filter(Boolean).join(", ") || "—"}
            </dd>
          </div>
          <div className="rounded-md border border-ifma-border-light bg-admin-surface-muted/50 px-4 py-3">
            <dt className="text-caisbe-muted">Membership date</dt>
            <dd className="mt-1 font-medium text-caisbe-text">{formatDate(user?.membership_date)}</dd>
          </div>
          <div className="rounded-md border border-ifma-border-light bg-admin-surface-muted/50 px-4 py-3">
            <dt className="text-caisbe-muted">Membership type</dt>
            <dd className="mt-1 font-medium text-caisbe-text">{membershipTypeLabel(user?.membership_type)}</dd>
          </div>
          <div className="rounded-md border border-ifma-border-light bg-admin-surface-muted/50 px-4 py-3">
            <dt className="text-caisbe-muted">Membership status</dt>
            <dd className="mt-1 font-medium capitalize text-caisbe-text">{user?.membership_status || "pending"}</dd>
          </div>
        </dl>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Course completion status</h2>
          <p className="mt-1 text-sm text-caisbe-muted">Current progress, submissions, and earned credentials.</p>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-ifma-border-light bg-admin-surface-muted/40 px-4 py-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                tab === item.id
                  ? "bg-caisbe-red text-white"
                  : "text-caisbe-muted hover:bg-admin-surface hover:text-caisbe-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-sm text-caisbe-muted">Loading…</p>
          ) : tab === "credentials" ? (
            certificates.length === 0 ? (
              <p className="text-sm text-caisbe-muted">Certificates stay inactive until you pass the final exam.</p>
            ) : (
              <ul className="space-y-3">
                {certificates.map((cert) => (
                  <li
                    key={cert.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ifma-border-light bg-admin-surface-muted/30 px-4 py-3"
                  >
                    <span className="font-medium text-caisbe-text">{cert.course.title}</span>
                    <Link href={`/certificates/${cert.certificate_code}`} className="text-sm font-semibold text-caisbe-red">
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : rows.length === 0 ? (
            <p className="text-sm text-caisbe-muted">Nothing in this list yet.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ifma-border-light bg-admin-surface-muted/30 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-caisbe-text">{enrollment.course.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      {enrollment.status.replaceAll("_", " ")} · {enrollment.progress}%
                    </p>
                  </div>
                  <Link
                    href={
                      enrollment.status === "pending_payment"
                        ? `/courses/${enrollment.course.id}/checkout`
                        : `/courses/${enrollment.course.id}`
                    }
                    className="text-sm font-semibold text-caisbe-red"
                  >
                    {enrollment.status === "pending_payment" ? "Pay" : "Open"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
