"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { fieldClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

type AccessValue = "allowed" | "restricted";

type AccessUser = {
  id: number;
  full_name: string;
  email: string;
  membership_type: string | null;
  membership_status: string;
  email_verified: boolean;
  suspended: boolean;
  login_locked: boolean;
};

type AccessEnrollment = {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  course_id: number;
  course_code: string;
  course_title: string;
  status: string;
  progress: number;
  course_access: AccessValue;
  exam_access: AccessValue;
  enrolled_at: string;
};

type AccessRestriction = {
  kind: "account" | "course" | "exam";
  student_id: number;
  student_name: string;
  student_email: string;
  enrollment_id: number | null;
  summary: string;
};

type LoginEvent = {
  id: number;
  user_id: number | null;
  email: string;
  success: boolean;
  reason: string;
  ip_address: string;
  created_at: string;
};

type AccessControl = {
  users: AccessUser[];
  enrollments: AccessEnrollment[];
  restrictions: AccessRestriction[];
  login_events: LoginEvent[];
};

type AccessNotice = {
  id: number;
  title: string;
  body: string;
  kind: string;
  read_at: string | null;
};

const SECTIONS = [
  { id: "users", label: "Users" },
  { id: "course-access", label: "Course Access" },
  { id: "exam-access", label: "Exam Access" },
  { id: "account-status", label: "Account Status" },
  { id: "restrictions", label: "Access Restrictions" },
  { id: "login-activity", label: "Login Activity" },
  { id: "activation", label: "Account Activation & Suspension" },
] as const;

const REASON_LABELS: Record<string, string> = {
  success: "Signed in",
  bad_credentials: "Wrong password",
  suspended: "Suspended",
  unverified: "Email not verified",
  locked: "Temporarily locked",
  unverified_pending: "Email not verified",
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AccessBadge({ value }: { value: AccessValue }) {
  return (
    <Badge tone={value === "restricted" ? "warning" : "success"}>
      {value === "restricted" ? "Restricted" : "Allowed"}
    </Badge>
  );
}

export default function AccessControlPage() {
  const [data, setData] = useState<AccessControl | null>(null);
  const [notices, setNotices] = useState<AccessNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await apiFetch<AccessControl>("/admin/access-control");
      setData(overview);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load access control.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    void apiFetch<{ items: AccessNotice[] }>("/me/notifications")
      .then(async (payload) => {
        const rows = (payload.items ?? []).filter((item) => item.kind === "access" && !item.read_at);
        if (!active) return;
        setNotices(rows);
        await Promise.all(
          rows.map((item) =>
            apiFetch(`/me/notifications/${item.id}/read`, { method: "POST" }).catch(() => undefined),
          ),
        );
      })
      .catch(() => {
        if (active) setNotices([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const needle = query.trim().toLowerCase();
  const users = useMemo(() => {
    if (!data) return [];
    if (!needle) return data.users;
    return data.users.filter(
      (user) => user.full_name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle),
    );
  }, [data, needle]);
  const enrollments = useMemo(() => {
    if (!data) return [];
    if (!needle) return data.enrollments;
    return data.enrollments.filter(
      (row) =>
        row.student_name.toLowerCase().includes(needle) ||
        row.student_email.toLowerCase().includes(needle) ||
        row.course_title.toLowerCase().includes(needle) ||
        row.course_code.toLowerCase().includes(needle),
    );
  }, [data, needle]);

  async function setAccess(enrollmentId: number, patch: { course_access?: AccessValue; exam_access?: AccessValue }) {
    const key = `${enrollmentId}-${patch.course_access ?? ""}-${patch.exam_access ?? ""}`;
    setBusy(key);
    setError(null);
    try {
      const updated = await apiFetch<AccessEnrollment>(`/admin/access-control/enrollments/${enrollmentId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setData((current) => {
        if (!current) return current;
        const nextEnrollments = current.enrollments.map((row) => (row.id === updated.id ? updated : row));
        return { ...current, enrollments: nextEnrollments, restrictions: rebuildRestrictions(current.users, nextEnrollments) };
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update access.");
    } finally {
      setBusy(null);
    }
  }

  async function setSuspended(userId: number, suspended: boolean) {
    setBusy(`user-${userId}`);
    setError(null);
    try {
      const updated = await apiFetch<AccessUser>(`/admin/access-control/users/${userId}/suspension`, {
        method: "POST",
        body: JSON.stringify({ suspended }),
      });
      setData((current) => {
        if (!current) return current;
        const nextUsers = current.users.map((user) => (user.id === updated.id ? updated : user));
        return { ...current, users: nextUsers, restrictions: rebuildRestrictions(nextUsers, current.enrollments) };
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update this account.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Access Control"
        description="Review student accounts. Payment still opens a course. Restrict a course, an exam, or the whole account when you need to."
      />

      <nav className="flex flex-wrap gap-2" aria-label="Access Control sections">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="inline-flex rounded-full border border-ifma-border bg-admin-surface px-3 py-1.5 text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
          >
            {section.label}
          </a>
        ))}
      </nav>

      {notices.length > 0 ? (
        <div className="space-y-2">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-text"
            >
              <p className="font-semibold text-caisbe-text-dark">{notice.title}</p>
              <p className="mt-1 leading-6">{notice.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      <label className="block max-w-md text-sm font-semibold text-caisbe-text">
        Search students or courses
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`${fieldClassName} mt-1`}
          placeholder="Name, email, or course"
        />
      </label>

      {loading || !data ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Section id="users" title="Users" description="Student accounts. Open a name to see the full student record.">
            <UserTable users={users} />
          </Section>

          <Section
            id="course-access"
            title="Course Access"
            description="Allowed after payment. Restrict stops course materials. Progress and certificates stay on the record."
          >
            <EnrollmentTable
              rows={enrollments}
              mode="course"
              busy={busy}
              onToggle={(row) =>
                void setAccess(row.id, {
                  course_access: row.course_access === "restricted" ? "allowed" : "restricted",
                })
              }
            />
          </Section>

          <Section
            id="exam-access"
            title="Exam Access"
            description="Block only the final exam, or allow it again, without closing the course."
          >
            <EnrollmentTable
              rows={enrollments}
              mode="exam"
              busy={busy}
              onToggle={(row) =>
                void setAccess(row.id, {
                  exam_access: row.exam_access === "restricted" ? "allowed" : "restricted",
                })
              }
            />
          </Section>

          <Section
            id="account-status"
            title="Account Status"
            description="Email verification, membership, temporary lockout after failed sign-in attempts, and suspension."
          >
            <StatusTable users={users} />
          </Section>

          <Section
            id="restrictions"
            title="Access Restrictions"
            description="Accounts, courses, and exams that are blocked right now."
          >
            <RestrictionTable rows={data.restrictions.filter((row) => matchesRestriction(row, needle))} />
          </Section>

          <Section
            id="login-activity"
            title="Login Activity"
            description="Recent sign-in successes and failures."
          >
            <ActivityTable
              rows={data.login_events.filter(
                (row) => !needle || row.email.toLowerCase().includes(needle),
              )}
            />
          </Section>

          <Section
            id="activation"
            title="Account Activation & Suspension"
            description="A suspended student cannot sign in. An open session stops on the next request."
          >
            <ActivationTable users={users} busy={busy} onToggle={(user) => void setSuspended(user.id, !user.suspended)} />
          </Section>
        </>
      )}
    </div>
  );
}

function matchesRestriction(row: AccessRestriction, needle: string) {
  if (!needle) return true;
  return (
    row.student_name.toLowerCase().includes(needle) ||
    row.student_email.toLowerCase().includes(needle) ||
    row.summary.toLowerCase().includes(needle)
  );
}

function rebuildRestrictions(users: AccessUser[], enrollments: AccessEnrollment[]): AccessRestriction[] {
  const rows: AccessRestriction[] = [];
  for (const user of users) {
    if (user.suspended) {
      rows.push({
        kind: "account",
        student_id: user.id,
        student_name: user.full_name,
        student_email: user.email,
        enrollment_id: null,
        summary: "Account suspended",
      });
    }
  }
  for (const row of enrollments) {
    if (row.course_access === "restricted") {
      rows.push({
        kind: "course",
        student_id: row.student_id,
        student_name: row.student_name,
        student_email: row.student_email,
        enrollment_id: row.id,
        summary: `Course restricted: ${row.course_title}`,
      });
    }
    if (row.exam_access === "restricted") {
      rows.push({
        kind: "exam",
        student_id: row.student_id,
        student_name: row.student_name,
        student_email: row.student_email,
        enrollment_id: row.id,
        summary: `Exam restricted: ${row.course_title}`,
      });
    }
  }
  return rows;
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-caisbe-muted">{description}</p>
        </div>
        {children}
      </Card>
    </section>
  );
}

function UserTable({ users }: { users: AccessUser[] }) {
  if (users.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No students" description="Student accounts appear here after they register." />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-admin-surface-muted/70">
          <tr>
            {["Student", "Membership", "Email"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold text-caisbe-text sm:px-6">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ifma-border-light">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-4 sm:px-6">
                <Link href={`/students/${user.id}`} className="font-semibold text-caisbe-text hover:text-caisbe-red hover:underline">
                  {user.full_name}
                </Link>
                <p className="mt-0.5 text-xs text-caisbe-muted">{user.email}</p>
              </td>
              <td className="px-4 py-4 text-caisbe-text sm:px-6">
                {user.membership_type || "No type"} · {user.membership_status || "pending"}
              </td>
              <td className="px-4 py-4 sm:px-6">
                <Badge tone={user.email_verified ? "success" : "warning"}>
                  {user.email_verified ? "Verified" : "Not verified"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnrollmentTable({
  rows,
  mode,
  busy,
  onToggle,
}: {
  rows: AccessEnrollment[];
  mode: "course" | "exam";
  busy: string | null;
  onToggle: (row: AccessEnrollment) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No enrollments" description="Course and exam access appear after a student is enrolled." />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[860px] w-full text-left text-sm">
        <thead className="bg-admin-surface-muted/70">
          <tr>
            {["Student", "Course", "Access", ""].map((header) => (
              <th key={header || "action"} className="px-4 py-3 font-semibold text-caisbe-text sm:px-6">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ifma-border-light">
          {rows.map((row) => {
            const value = mode === "course" ? row.course_access : row.exam_access;
            const next = value === "restricted" ? "allowed" : "restricted";
            const key = `${row.id}-${mode === "course" ? next : ""}-${mode === "exam" ? next : ""}`;
            return (
              <tr key={`${mode}-${row.id}`}>
                <td className="px-4 py-4 sm:px-6">
                  <p className="font-semibold text-caisbe-text">{row.student_name}</p>
                  <p className="mt-0.5 text-xs text-caisbe-muted">{row.student_email}</p>
                </td>
                <td className="px-4 py-4 sm:px-6">
                  <p className="font-medium text-caisbe-text">{row.course_title}</p>
                  <p className="mt-0.5 text-xs text-caisbe-muted">
                    {row.course_code} · {row.progress}%
                  </p>
                </td>
                <td className="px-4 py-4 sm:px-6">
                  <AccessBadge value={value} />
                </td>
                <td className="px-4 py-4 text-right sm:px-6">
                  <button
                    type="button"
                    disabled={busy === key}
                    onClick={() => onToggle(row)}
                    className="inline-flex h-9 items-center rounded-full border-2 border-caisbe-red px-4 text-sm font-bold text-caisbe-red hover:bg-caisbe-red hover:text-white disabled:opacity-60"
                  >
                    {busy === key ? "Saving…" : value === "restricted" ? "Allow" : "Restrict"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusTable({ users }: { users: AccessUser[] }) {
  if (users.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No students" description="Account status appears after a student registers." />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[860px] w-full text-left text-sm">
        <thead className="bg-admin-surface-muted/70">
          <tr>
            {["Student", "Email", "Membership", "Sign-in", "Account"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold text-caisbe-text sm:px-6">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ifma-border-light">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-4 sm:px-6">
                <p className="font-semibold text-caisbe-text">{user.full_name}</p>
                <p className="mt-0.5 text-xs text-caisbe-muted">{user.email}</p>
              </td>
              <td className="px-4 py-4 sm:px-6">
                <Badge tone={user.email_verified ? "success" : "warning"}>
                  {user.email_verified ? "Verified" : "Not verified"}
                </Badge>
              </td>
              <td className="px-4 py-4 capitalize text-caisbe-text sm:px-6">
                {user.membership_status.replaceAll("_", " ")}
              </td>
              <td className="px-4 py-4 sm:px-6">
                <Badge tone={user.login_locked ? "warning" : "success"}>
                  {user.login_locked ? "Locked" : "Open"}
                </Badge>
              </td>
              <td className="px-4 py-4 sm:px-6">
                <Badge tone={user.suspended ? "warning" : "success"}>
                  {user.suspended ? "Suspended" : "Active"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RestrictionTable({ rows }: { rows: AccessRestriction[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="Nothing is restricted" description="Restricted accounts, courses, and exams are listed here." />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-admin-surface-muted/70">
          <tr>
            {["Type", "Student", "Restriction"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold text-caisbe-text sm:px-6">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ifma-border-light">
          {rows.map((row) => (
            <tr key={`${row.kind}-${row.student_id}-${row.enrollment_id ?? "account"}`}>
              <td className="px-4 py-4 capitalize sm:px-6">
                <Badge tone="warning">{row.kind}</Badge>
              </td>
              <td className="px-4 py-4 sm:px-6">
                <p className="font-semibold text-caisbe-text">{row.student_name}</p>
                <p className="mt-0.5 text-xs text-caisbe-muted">{row.student_email}</p>
              </td>
              <td className="px-4 py-4 text-caisbe-text sm:px-6">{row.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTable({ rows }: { rows: LoginEvent[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No sign-in activity yet" description="Successes and failures appear here after students sign in." />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[860px] w-full text-left text-sm">
        <thead className="bg-admin-surface-muted/70">
          <tr>
            {["When", "Account", "Result", "IP address"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold text-caisbe-text sm:px-6">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ifma-border-light">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-4 text-caisbe-muted sm:px-6">{formatWhen(row.created_at)}</td>
              <td className="px-4 py-4 text-caisbe-text sm:px-6">{row.email}</td>
              <td className="px-4 py-4 sm:px-6">
                <Badge tone={row.success ? "success" : "warning"}>
                  {REASON_LABELS[row.reason] ?? row.reason}
                </Badge>
              </td>
              <td className="px-4 py-4 text-caisbe-muted sm:px-6">{row.ip_address || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivationTable({
  users,
  busy,
  onToggle,
}: {
  users: AccessUser[];
  busy: string | null;
  onToggle: (user: AccessUser) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No students" description="Activate or suspend a student account from this list." />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-admin-surface-muted/70">
          <tr>
            {["Student", "Account", ""].map((header) => (
              <th key={header || "action"} className="px-4 py-3 font-semibold text-caisbe-text sm:px-6">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ifma-border-light">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-4 sm:px-6">
                <p className="font-semibold text-caisbe-text">{user.full_name}</p>
                <p className="mt-0.5 text-xs text-caisbe-muted">{user.email}</p>
              </td>
              <td className="px-4 py-4 sm:px-6">
                <Badge tone={user.suspended ? "warning" : "success"}>
                  {user.suspended ? "Suspended" : "Active"}
                </Badge>
              </td>
              <td className="px-4 py-4 text-right sm:px-6">
                <button
                  type="button"
                  disabled={busy === `user-${user.id}`}
                  onClick={() => onToggle(user)}
                  className="inline-flex h-9 items-center rounded-full border-2 border-caisbe-red px-4 text-sm font-bold text-caisbe-red hover:bg-caisbe-red hover:text-white disabled:opacity-60"
                >
                  {busy === `user-${user.id}` ? "Saving…" : user.suspended ? "Activate" : "Suspend"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
