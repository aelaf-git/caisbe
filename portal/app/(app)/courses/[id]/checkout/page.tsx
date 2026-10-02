"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import ProfileForm, { profileFromUser } from "@/components/portal/ProfileForm";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError, type Course } from "@/lib/auth";
import {
  STRIPE_PROMO_HINT,
  formatMoney,
  type CheckoutPreview,
  type CheckoutResult,
} from "@/lib/commerce";

export default function CourseCheckoutPage() {
  return (
    <Suspense fallback={<p className="text-sm text-caisbe-muted">Loading checkout…</p>}>
      <CourseCheckoutInner />
    </Suspense>
  );
}

function CourseCheckoutInner() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [quote, setQuote] = useState<CheckoutPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cancelled = searchParams.get("cancelled") === "1";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const courses = await apiFetch<Course[]>("/courses", { auth: false });
        if (!active) return;
        const found = courses.find((item) => item.id === courseId) ?? null;
        setCourse(found);
        if (found) {
          const preview = await apiFetch<CheckoutPreview>("/me/checkout/preview", {
            method: "POST",
            body: JSON.stringify({ course_id: found.id }),
          });
          if (active) setQuote(preview);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load checkout.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [courseId]);

  async function pay() {
    if (!course) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<CheckoutResult>("/me/checkout", {
        method: "POST",
        body: JSON.stringify({ course_id: course.id }),
      });
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
      router.push(`/checkout/success?order=${result.order_number}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-3">
        <BackButton href="/courses" />
        <div>
          <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Buy now</h1>
          <p className="mt-1 text-sm text-caisbe-muted">
            Complete your profile, then pay to unlock this course. Prefer several courses?{" "}
            <Link href="/cart" className="font-semibold text-caisbe-red hover:underline">
              Use your cart
            </Link>
            .
          </p>
        </div>
      </div>

      {cancelled ? <p className="text-sm text-caisbe-red">Checkout was cancelled. You can try again below.</p> : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      {course ? (
        <section className="border border-ifma-border bg-admin-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{course.code}</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-caisbe-text-dark">{course.title}</h2>
          {quote ? (
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(quote.subtotal_cents, quote.currency)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatMoney(quote.total_cents, quote.currency)}</dd></div>
            </dl>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-caisbe-muted">Loading course…</p>
      )}

      {!user?.profile_completed ? (
        <section className="border border-ifma-border bg-admin-surface p-6">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Student profile</h2>
          <p className="mt-1 mb-4 text-sm text-caisbe-muted">Required before payment.</p>
          <ProfileForm
            initial={profileFromUser(user)}
            submitLabel="Save and continue"
            onSaved={() => void refreshUser()}
          />
        </section>
      ) : (
        <>
          {quote && !quote.complimentary ? (
            <p className="text-sm text-caisbe-muted">{quote.message || STRIPE_PROMO_HINT}</p>
          ) : null}
          <button
            type="button"
            disabled={busy || !course}
            onClick={() => void pay()}
            className="inline-flex h-12 items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {busy
              ? "Processing…"
              : quote?.complimentary || quote?.total_cents === 0
                ? "Confirm complimentary enrollment"
                : "Pay with card"}
          </button>
        </>
      )}
    </div>
  );
}
