"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import DownloadCertificateButton from "@/components/certificates/DownloadCertificateButton";
import MembershipCertificateDocument from "@/components/certificates/MembershipCertificateDocument";
import MembershipApplicationForm from "@/components/membership/MembershipApplicationForm";
import { certificatePdfFileName } from "@/lib/certificatePdf";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";
import { membershipTypeLabel } from "@/lib/commerce";
import type { MembershipCertificate } from "@/lib/lms";

function MemberPathCard({
  title,
  description,
  selected,
  onSelect,
  mark,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  mark: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[20px] p-6 text-left shadow-hopewell transition duration-300 hover:-translate-y-1 ${
        selected ? "bg-caisbe-red/5 ring-2 ring-caisbe-red" : "bg-white"
      }`}
    >
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-md text-lg font-bold ${
          selected ? "bg-caisbe-red text-white" : "bg-[#fafafa] text-caisbe-red"
        }`}
      >
        {mark}
      </span>
      <h3 className="mt-4 font-display text-xl font-semibold text-caisbe-text-dark">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-caisbe-muted">{description}</p>
    </button>
  );
}

export default function PortalMembershipPage() {
  const { user, refreshUser } = useAuth();
  const [cert, setCert] = useState<MembershipCertificate | null>(null);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<"new" | "existing" | null>(null);

  async function loadCertificate() {
    setLoading(true);
    setError(null);
    setLockedMessage(null);
    try {
      const data = await apiFetch<MembershipCertificate>("/me/membership-certificate");
      setCert(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setCert(null);
        setLockedMessage(err.detail);
      } else {
        setError(err instanceof ApiError ? err.detail : "Unable to load your membership certificate.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCertificate();
  }, [user?.id, user?.membership_type]);

  const verifyUrl = useMemo(() => {
    if (!cert) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/certificates/verify/${cert.certificate_code}`;
    }
    return cert.verify_url || "";
  }, [cert]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Membership"
        title="Your membership"
        description="You are a CAISBE student member by default. View and print your certificate, or use the forms below to upgrade or renew."
      />

      {error ? (
        <div className="border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">{error}</div>
      ) : null}

      <section className="rounded-[20px] bg-white p-6 shadow-hopewell">
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Current type</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">
          {membershipTypeLabel(user?.membership_type || "student")}
        </h2>
        <p className="mt-1 text-sm capitalize text-caisbe-muted">
          Status: {user?.membership_status || "active"}
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-caisbe-muted">Loading certificate…</p>
        ) : lockedMessage ? (
          <p className="mt-4 text-sm text-caisbe-red">{lockedMessage}</p>
        ) : cert ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-caisbe-muted">
                {cert.membership_number}
                {cert.expires_at
                  ? ` · Valid until ${new Date(cert.expires_at).toLocaleDateString(undefined, { dateStyle: "long" })}`
                  : " · Lifetime"}
              </p>
              <Link
                href="/certificates/membership"
                className="text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:text-caisbe-red-dark"
              >
                Open full certificate
              </Link>
            </div>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-[900px]">
                <MembershipCertificateDocument
                  studentName={cert.student_name}
                  membershipNumber={cert.membership_number}
                  issuedAt={cert.issued_at}
                  validUntil={cert.expires_at}
                  verifyUrl={verifyUrl}
                  certificateCode={cert.certificate_code}
                  issuedBy={cert.issued_by}
                  title={cert.title}
                  body={cert.body ?? undefined}
                />
              </div>
            </div>
            <div className="print:hidden">
              <DownloadCertificateButton
                fileName={certificatePdfFileName(["CAISBE", cert.membership_number, "membership"])}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">
          Upgrade or renew
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <MemberPathCard
            title="Become a new membership type"
            description="Use the membership application to upgrade from student to another CAISBE membership type."
            selected={path === "new"}
            onSelect={() => setPath("new")}
            mark="1"
          />
          <MemberPathCard
            title="Renew membership"
            description="Renew your current membership so the certificate validity period is extended."
            selected={path === "existing"}
            onSelect={() => setPath("existing")}
            mark="2"
          />
        </div>
        {path === "new" ? (
          <MembershipApplicationForm
            kind="application"
            variant="account"
            user={user}
            onSuccess={() => {
              void refreshUser();
              void loadCertificate();
            }}
          />
        ) : null}
        {path === "existing" ? (
          <MembershipApplicationForm
            kind="renewal"
            variant="account"
            user={user}
            onSuccess={() => {
              void refreshUser();
              void loadCertificate();
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
