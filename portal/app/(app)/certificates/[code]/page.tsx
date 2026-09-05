"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import CertificateDocument from "@/components/certificates/CertificateDocument";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError } from "@/lib/auth";
import type { Certificate } from "@/lib/lms";

function verifyUrlFor(cert: Certificate): string {
  if (cert.verify_url) return cert.verify_url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/certificates/verify/${cert.certificate_code}`;
  }
  return `/certificates/verify/${cert.certificate_code}`;
}

export default function CertificatePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cert, setCert] = useState<Certificate | null>(null);
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
        const data = await apiFetch<Certificate>(`/me/certificates/${params.code}`);
        if (active) setCert(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Certificate not found.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user, params.code]);

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
        <CertificateDocument
          studentName={cert.student_name}
          courseTitle={cert.course.title}
          issuedAt={cert.issued_at}
          verifyUrl={verifyUrl}
          certificateCode={cert.certificate_code}
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
