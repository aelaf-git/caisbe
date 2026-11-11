"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import CheckoutDesk from "@/components/commerce/CheckoutDesk";
import EmbeddedStripeCheckout from "@/components/commerce/EmbeddedStripeCheckout";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError, type Course } from "@/lib/auth";
import { embeddedCheckout, followCheckout, type CheckoutPreview, type CheckoutResult } from "@/lib/commerce";
import { resolveUploadUrl } from "@/lib/mediaUrl";

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
  const [stripePay, setStripePay] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const cancelled = searchParams.get("cancelled") === "1";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const courses = await apiFetch<Course[]>("/courses", { auth: false });
        if (!active) return;
        const found = courses.find((item) => item.id === courseId) ?? null;
        setCourse(found);
        if (!found) {
          setError("This course is not available.");
          return;
        }
        const preview = await apiFetch<CheckoutPreview>("/me/checkout/preview", {
          method: "POST",
          body: JSON.stringify({ course_id: found.id }),
        });
        if (active) setQuote(preview);
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
      const session = embeddedCheckout(result);
      if (session) {
        setStripePay(session);
        return;
      }
      if (followCheckout(result)) return;
      await refreshUser();
      router.push(`/checkout/success?order=${result.order_number}`);
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Unable to complete purchase.";
      setError(
        /already enrolled/i.test(detail)
          ? "You already have this course. Other programs are still available on My courses."
          : detail,
      );
    } finally {
      setBusy(false);
    }
  }

  const cover = course?.cover_url ? resolveUploadUrl(course.cover_url) ?? course.cover_url : null;
  const complimentary = Boolean(quote?.complimentary || quote?.total_cents === 0);

  return (
    <div className="space-y-6">
      <BackButton href={`/courses/${courseId}/summary`} />

      {cancelled ? (
        <div className="border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          Checkout was cancelled. You can try again below.
        </div>
      ) : null}
      {error ? (
        <div className="border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          <p>{error}</p>
          {/already have this course/i.test(error) ? (
            <Link href="/courses" className="mt-2 inline-flex font-semibold underline">
              Browse other courses
            </Link>
          ) : null}
        </div>
      ) : null}

      {course && quote ? (
        <CheckoutDesk
          lines={[
            {
              id: String(course.id),
              title: course.title,
              meta: course.code,
              priceCents: quote.items?.[0]?.unit_price_cents ?? quote.subtotal_cents,
              coverUrl: cover,
            },
          ]}
          currency={quote.currency}
          subtotalCents={quote.subtotal_cents}
          discountCents={quote.discount_cents}
          totalCents={quote.total_cents}
          studentName={user?.full_name?.trim() || "Student"}
          complimentary={complimentary}
          cardReady={Boolean(quote.card_payments_ready)}
          busy={busy}
          onPay={() => void buy()}
          payment={
            stripePay ? (
              <EmbeddedStripeCheckout
                publishableKey={stripePay.publishableKey}
                clientSecret={stripePay.clientSecret}
              />
            ) : undefined
          }
        />
      ) : error ? null : (
        <p className="text-sm text-caisbe-muted">Loading checkout…</p>
      )}
    </div>
  );
}
