"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import type { Certificate } from "@/lib/lms";

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<Certificate[]>("/me/certificates");
        if (active) setCertificates(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load certificates.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Certificates</h1>
        <p className="mt-2 text-sm text-caisbe-muted">Digital certificates you have earned.</p>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <section className="border border-ifma-border bg-white">
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : certificates.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-caisbe-muted">Complete a final exam to earn a digital certificate.</p>
            <Link href="/courses" className="mt-3 inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark">
              Go to courses
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {certificates.map((cert) => (
              <li key={cert.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="font-semibold text-caisbe-text">{cert.course.title}</p>
                  <p className="text-sm text-caisbe-muted">{cert.certificate_code}</p>
                </div>
                <Link
                  href={`/certificates/${cert.certificate_code}`}
                  className="text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:text-caisbe-red-dark"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
