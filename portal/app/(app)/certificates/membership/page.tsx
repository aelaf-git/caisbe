"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import MembershipCertificateDocument from "@/components/certificates/MembershipCertificateDocument";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError } from "@/lib/auth";
import type { MembershipCertificate } from "@/lib/lms";

function verifyUrlFor(cert: MembershipCertificate): string {
  if (cert.verify_url) return cert.verify_url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/certificates/verify/${cert.certificate_code}`;
  }
  return `/certificates/verify/${cert.certificate_code}`;
}

export default function MembershipCertificatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cert, setCert] = useState<MembershipCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      try {
        const data = await apiFetch<MembershipCertificate>("/me/membership-certificate");
        if (active) setCert(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Certificate not found.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  const verifyUrl = useMemo(() => (cert ? verifyUrlFor(cert) : ""), [cert]);

  if (loading || !user) {
    return <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading…</div>;
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-caisbe-red">{error}</p>
        <BackButton href="/certificates" className="mt-4" />
      </div>
    );
  }

  if (!cert) {
    return <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading certificate…</div>;
  }

  return (
    <section className="print:p-0">
      <div className="print:hidden">
        <BackButton href="/certificates" />
      </div>

      <div className="mt-6 print:mt-0">
        <MembershipCertificateDocument
          studentName={cert.student_name}
          membershipNumber={cert.membership_number}
          issuedAt={cert.issued_at}
          verifyUrl={verifyUrl}
          certificateCode={cert.certificate_code}
          issuedBy={cert.issued_by}
          title={cert.title}
        />
      </div>

      <div className="mt-6 text-center print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark"
        >
          Print / Save PDF
        </button>
      </div>
    </section>
  );
}
