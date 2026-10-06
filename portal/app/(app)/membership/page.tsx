"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import DownloadCertificateButton from "@/components/certificates/DownloadCertificateButton";
import MembershipCertificateDocument from "@/components/certificates/MembershipCertificateDocument";
import MembershipApplicationForm from "@/components/membership/MembershipApplicationForm";
import { certificatePdfFileName } from "@/lib/certificatePdf";
import { certificateVerifyUrl } from "@/lib/certificateVerifyUrl";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";
import { formatMoney, membershipTypeLabel, type CheckoutResult } from "@/lib/commerce";
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
        selected
          ? "bg-admin-surface-muted ring-2 ring-caisbe-red"
          : "bg-admin-surface"
      }`}
    >
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-md text-lg font-bold ${
          selected ? "bg-caisbe-red text-white" : "bg-admin-surface-muted text-caisbe-red"
        }`}
      >
        {mark}
      </span>
      <h3 className="mt-4 font-display text-xl font-semibold text-caisbe-text-dark">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-caisbe-muted">{description}</p>
    </button>
  );
}

function MembershipPageInner() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [cert, setCert] = useState<MembershipCertificate | null>(null);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<"new" | "existing" | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const pendingType = user?.pending_membership_type;
  const pendingLabel =
    user?.pending_membership_label || membershipTypeLabel(pendingType || undefined);
  const pendingPrice = user?.pending_membership_price_cents;
  const pendingCurrency = user?.pending_membership_currency || "cad";
  const pendingKind = user?.pending_membership_kind || "application";

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
  }, [user?.id, user?.membership_type, user?.membership_status, pendingType]);

  useEffect(() => {
    if (searchParams.get("cancelled") === "1") {
      setPayError("Payment was cancelled. You can try again when ready.");
    }
  }, [searchParams]);

  const verifyUrl = useMemo(
    () => (cert ? certificateVerifyUrl(cert.certificate_code, cert.verify_url) : ""),
    [cert],
  );

  async function startMembershipPayment() {
    if (!pendingType) return;
    setPaying(true);
    setPayError(null);
    try {
      await apiFetch<CheckoutResult>("/me/membership/checkout", {
        method: "POST",
        body: JSON.stringify({
          membership_type: pendingType,
          kind: pendingKind,
        }),
      });
      await refreshUser();
      await loadCertificate();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setPayError(err instanceof ApiError ? err.detail : "Unable to complete membership payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Membership"
        title="Your membership"
        description="Student membership includes a free certificate. Paid membership types show their catalog price and unlock after you confirm payment below."
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
          <div className="mt-4 space-y-2">
            <p className="text-sm text-caisbe-red">{lockedMessage}</p>
            <p className="text-sm text-caisbe-muted">
              Complete payment below to unlock your paid membership certificate.
            </p>
          </div>
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
            title="Upgrade Membership"
            description="Apply for another membership type, then confirm payment to unlock its certificate."
            selected={path === "new"}
            onSelect={() => setPath("new")}
            mark="1"
          />
          <MemberPathCard
            title="Renew membership"
            description="Renew a paid membership, then confirm payment to extend the certificate."
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
              void refreshUser().then(() => {
                void loadCertificate();
                document.getElementById("membership-payment")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              });
            }}
          />
        ) : null}
        {path === "existing" ? (
          <MembershipApplicationForm
            kind="renewal"
            variant="account"
            user={user}
            onSuccess={() => {
              void refreshUser().then(() => {
                void loadCertificate();
                document.getElementById("membership-payment")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              });
            }}
          />
        ) : null}
      </section>

      {pendingType ? (
        <section
          id="membership-payment"
          className="rounded-[20px] border-2 border-caisbe-red/30 bg-white p-6 shadow-hopewell"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            Payment required
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">
            {pendingKind === "renewal" ? "Renew" : "Activate"} {pendingLabel}
          </h2>
          <p className="mt-2 text-sm leading-6 text-caisbe-muted">
            Confirm payment for this membership type. Your certificate updates as soon as payment is
            confirmed.
          </p>
          <p className="mt-4 text-lg font-semibold text-caisbe-text-dark">
            {typeof pendingPrice === "number"
              ? formatMoney(pendingPrice, pendingCurrency)
              : "Price unavailable"}
          </p>
          {typeof pendingPrice === "number" && pendingPrice > 0 ? (
            <p className="mt-1 text-xs text-caisbe-muted">
              Card checkout via Stripe will be added next. For now, confirm to activate this paid
              membership and issue its certificate.
            </p>
          ) : null}
          {payError ? <p className="mt-3 text-sm text-caisbe-red">{payError}</p> : null}
          <button
            type="button"
            disabled={paying || typeof pendingPrice !== "number"}
            onClick={() => void startMembershipPayment()}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {paying
              ? "Confirming…"
              : typeof pendingPrice === "number"
                ? `Confirm payment · ${formatMoney(pendingPrice, pendingCurrency)}`
                : "Confirm payment"}
          </button>
        </section>
      ) : null}
    </div>
  );
}

export default function PortalMembershipPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading membership…</div>
      }
    >
      <MembershipPageInner />
    </Suspense>
  );
}
