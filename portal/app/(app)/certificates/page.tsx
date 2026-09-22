"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import type { Certificate, MembershipCertificate } from "@/lib/lms";

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [membership, setMembership] = useState<MembershipCertificate | null>(null);
  const [membershipLocked, setMembershipLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      setMembershipLocked(false);
      try {
        const completionData = await apiFetch<Certificate[]>("/me/certificates");
        if (!active) return;
        setCertificates(completionData);

        try {
          const membershipData = await apiFetch<MembershipCertificate>("/me/membership-certificate");
          if (!active) return;
          setMembership(membershipData);
        } catch (err) {
          if (!active) return;
          if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
            setMembership(null);
            setMembershipLocked(true);
          } else {
            throw err;
          }
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.detail : "Unable to load certificates.");
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
        <p className="mt-2 text-sm text-caisbe-muted">
          Your membership certificate and any course completion certificates you have earned.
        </p>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <section className="border border-ifma-border bg-white">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">Membership</h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Unlocks automatically after you finish your first course.
          </p>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : membership ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <p className="font-semibold text-caisbe-text">{membership.title}</p>
              <p className="mt-1 text-sm text-caisbe-muted">
                {membership.membership_number} · {membership.certificate_code}
              </p>
            </div>
            <Link
              href="/certificates/membership"
              className="text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:text-caisbe-red-dark"
            >
              View / Print
            </Link>
          </div>
        ) : membershipLocked ? (
          <div className="p-6">
            <p className="text-sm text-caisbe-muted">
              Complete at least one course to unlock your membership certificate.
            </p>
            <Link
              href="/courses"
              className="mt-3 inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
            >
              Go to courses
            </Link>
          </div>
        ) : (
          <p className="p-6 text-sm text-caisbe-muted">Membership certificate unavailable.</p>
        )}
      </section>

      <section className="border border-ifma-border bg-white">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">Course completion</h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Earned when you finish a certificate program.
          </p>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : certificates.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-caisbe-muted">
              Complete a course to earn a digital completion certificate.
            </p>
            <Link
              href="/courses"
              className="mt-3 inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
            >
              Go to courses
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {certificates.map((cert) => (
              <li
                key={cert.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
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
