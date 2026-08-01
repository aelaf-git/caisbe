"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
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

  if (loading || !user) {
    return <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading…</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-caisbe-red">{error}</p>
        <Link href="/my-account" className="mt-4 inline-block text-sm text-caisbe-green">
          ← My Account
        </Link>
      </div>
    );
  }

  if (!cert) {
    return <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading certificate…</div>;
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/my-account" className="text-sm text-caisbe-muted hover:text-caisbe-green">
        ← My Account
      </Link>
      <div className="mt-6 border-4 border-caisbe-green bg-white px-8 py-12 text-center print:border-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">CAISBE</p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-caisbe-green">{cert.title}</h1>
        <p className="mt-6 text-lg text-caisbe-text">{cert.body}</p>
        <p className="mt-8 text-sm text-caisbe-muted">Certificate ID: {cert.certificate_code}</p>
        <p className="mt-1 text-sm text-caisbe-muted">
          Issued {new Date(cert.issued_at).toLocaleDateString()}
        </p>
      </div>
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase text-white"
        >
          Print / Save PDF
        </button>
      </div>
    </section>
  );
}
