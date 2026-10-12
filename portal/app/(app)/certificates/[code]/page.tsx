"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import CertificateDocument from "@/components/certificates/CertificateDocument";
import DownloadCertificateButton from "@/components/certificates/DownloadCertificateButton";
import BackButton from "@/components/ui/BackButton";
import { certificatePdfFileName } from "@/lib/certificatePdf";
import { certificateVerifyUrl } from "@/lib/certificateVerifyUrl";
import { apiFetch, ApiError } from "@/lib/auth";
import type { Certificate } from "@/lib/lms";

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

  const verifyUrl = useMemo(
    () => (cert ? certificateVerifyUrl(cert.certificate_code, cert.verify_url) : ""),
    [cert],
  );

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
          courseTitle={cert.program_name || cert.course.title}
          issuedAt={cert.issued_at}
          verifyUrl={verifyUrl}
          certificateCode={cert.certificate_code}
          issuedBy={cert.issued_by}
        />
      </div>

      <div className="mt-6 flex justify-center print:hidden">
        <DownloadCertificateButton
          fileName={certificatePdfFileName([
            "CAISBE",
            cert.certificate_code,
            cert.program_name || cert.course.title,
          ])}
        />
      </div>
    </section>
  );
}
