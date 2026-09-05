"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { CertificateVerify } from "@/lib/lms";

export default function VerifyCertificatePage() {
  const params = useParams<{ code: string }>();
  const [result, setResult] = useState<CertificateVerify | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setNotFound(false);
      setResult(null);
      try {
        const response = await fetch(`/api/certificates/verify/${encodeURIComponent(params.code)}`);
        if (response.status === 404) {
          if (active) setNotFound(true);
          return;
        }
        if (!response.ok) {
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

  const issuedLabel = result
    ? new Date(result.issued_at).toLocaleDateString(undefined, { dateStyle: "long" })
    : "";

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-ifma-border bg-white px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-caisbe-red">CAISBE</p>
          <Link href="/login" className="text-sm font-medium text-caisbe-green hover:underline">
            Student login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 md:px-8 md:py-16">
        <div className="w-full max-w-lg border border-ifma-border bg-white p-8 shadow-brand-card">
          {loading ? (
            <p className="text-center text-sm text-caisbe-muted">Verifying certificate…</p>
          ) : notFound ? (
            <>
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                Not found
              </p>
              <h1 className="mt-3 text-center font-display text-2xl font-semibold text-caisbe-text-dark">
                Certificate not found
              </h1>
              <p className="mt-4 text-center text-sm text-caisbe-muted">
                No certificate matches <span className="font-mono text-caisbe-text">{params.code}</span>.
                Check the code and try again.
              </p>
            </>
          ) : result ? (
            <>
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-caisbe-green">
                Valid certificate
              </p>
              <h1 className="mt-3 text-center font-display text-2xl font-semibold text-caisbe-text-dark">
                {result.student_name}
              </h1>
              <p className="mt-2 text-center text-sm text-caisbe-muted">has successfully completed</p>
              <p className="mt-1 text-center text-lg font-semibold text-caisbe-text">{result.course_title}</p>
              <dl className="mt-8 space-y-3 border-t border-ifma-border pt-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-caisbe-muted">Certificate ID</dt>
                  <dd className="font-mono text-right text-caisbe-text">{result.certificate_code}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-caisbe-muted">Issued</dt>
                  <dd className="text-right text-caisbe-text">{issuedLabel}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
