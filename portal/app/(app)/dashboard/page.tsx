"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError, type Enrollment } from "@/lib/auth";
import { formatDate, membershipTypeLabel } from "@/lib/commerce";
import type { Certificate } from "@/lib/lms";

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
        eyebrow="Student"
        title="Dashboard"
        description={`Welcome back, ${user?.full_name}. Track your courses, submissions, and credentials.`}
        actions={
          <Link
            href="/courses"
            className="inline-flex h-11 items-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark"
          >
            Browse courses
          </Link>
        }
      />

      {error ? (
        <div className="border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">{error}</div>
      ) : null}

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
                  ? "bg-caisbe-red/10 text-caisbe-red"
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
