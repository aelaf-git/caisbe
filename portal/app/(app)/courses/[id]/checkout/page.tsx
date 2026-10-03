"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import BackButton from "@/components/ui/BackButton";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError, type Course } from "@/lib/auth";
import { formatMoney, type CheckoutPreview, type CheckoutResult } from "@/lib/commerce";

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
  const { refreshUser } = useAuth();
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

  async function buy() {
    if (!course) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<CheckoutResult>("/me/checkout", {
        method: "POST",
        body: JSON.stringify({ course_id: course.id }),
      });
      await refreshUser();
      router.push(`/checkout/success?order=${result.order_number}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to complete purchase.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <BackButton href="/courses" />
        <PageHeader
          eyebrow="Learning"
          title="Buy course"
          description={
            <>
              Buy to unlock this course. Prefer several courses?{" "}
              <Link href="/cart" className="font-semibold text-caisbe-red hover:underline">
                Use your cart
              </Link>
              .
            </>
          }
        />
      </div>

      {cancelled ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          Checkout was cancelled. You can try again below.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </div>
      ) : null}

      {course ? (
        <section className="rounded-[20px] bg-white p-6 shadow-hopewell">
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{course.code}</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-caisbe-text-dark">{course.title}</h2>
          {quote ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-caisbe-muted">
                <dt>Subtotal</dt>
                <dd>{formatMoney(quote.subtotal_cents, quote.currency)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold text-caisbe-text-dark">
                <dt>Total</dt>
                <dd>{formatMoney(quote.total_cents, quote.currency)}</dd>
              </div>
            </dl>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-caisbe-muted">Loading course…</p>
      )}

      <section className="rounded-[20px] border-2 border-caisbe-red/30 bg-white p-6 shadow-hopewell">
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Payment</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">Buy this course</h2>
        <p className="mt-2 text-sm leading-6 text-caisbe-muted">
          Confirm to purchase. Course access unlocks immediately after you buy.
        </p>
        {quote ? (
          <p className="mt-4 text-lg font-semibold text-caisbe-text-dark">
            {formatMoney(quote.total_cents, quote.currency)}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-caisbe-muted">
          Card checkout via Stripe will be added next. For now, buy to enroll immediately.
        </p>
        <button
          type="button"
          disabled={busy || !course}
          onClick={() => void buy()}
          className="mt-5 inline-flex h-11 items-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
        >
          {busy
            ? "Buying…"
            : quote
              ? `Buy now · ${formatMoney(quote.total_cents, quote.currency)}`
              : "Buy now"}
        </button>
      </section>
    </div>
  );
}
