"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import CertificateDocument from "@/components/certificates/CertificateDocument";
import MembershipCertificateDocument from "@/components/certificates/MembershipCertificateDocument";
import type { CertificateVerify } from "@/lib/lms";

export default function VerifyCertificatePage() {
  const params = useParams<{ code: string }>();
  const [result, setResult] = useState<CertificateVerify | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(`${window.location.origin}/certificates/verify/${params.code}`);
  }, [params.code]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setNotFound(false);
      setResult(null);
      try {
        const response = await fetch(`/api/certificates/verify/${encodeURIComponent(params.code)}`);
        if (response.status === 404 || !response.ok) {
          if (active) setNotFound(true);
          return;
        }
        const data = (await response.json()) as CertificateVerify;
        if (active) setResult(data);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [params.code]);

  const verifyUrl = pageUrl || result?.verify_url || "";
  const isMembership = result?.kind === "membership";

  return (
    <div className="flex min-h-full flex-col bg-admin-canvas">
      <header className="border-b border-ifma-border bg-admin-surface px-4 py-4 print:hidden md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-caisbe-red">CAISBE</p>
          <Link href="/login" className="text-sm font-medium text-caisbe-red hover:underline">
            Student login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 md:px-8 md:py-12">
        {loading || (result && !verifyUrl) ? (
          <p className="text-sm text-caisbe-muted">Loading certificate…</p>
        ) : notFound || !result ? (
          <div className="w-full max-w-lg border border-ifma-border bg-admin-surface p-8 shadow-brand-card">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-caisbe-red">Not found</p>
            <h1 className="mt-3 text-center font-display text-2xl font-semibold text-caisbe-text-dark">
              Certificate not found
            </h1>
            <p className="mt-4 text-center text-sm text-caisbe-muted">
              No certificate matches <span className="font-mono text-caisbe-text">{params.code}</span>.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            {isMembership && result.membership_number ? (
              <MembershipCertificateDocument
                studentName={result.student_name}
                membershipNumber={result.membership_number}
                issuedAt={result.issued_at}
                verifyUrl={verifyUrl}
                certificateCode={result.certificate_code}
                issuedBy={result.issued_by}
              />
            ) : (
              <CertificateDocument
                studentName={result.student_name}
                courseTitle={result.course_title || "Course"}
                issuedAt={result.issued_at}
                verifyUrl={verifyUrl}
                certificateCode={result.certificate_code}
                issuedBy={result.issued_by}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
