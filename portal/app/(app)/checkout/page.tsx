"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import CheckoutDesk, { type CheckoutLine } from "@/components/commerce/CheckoutDesk";
import EmbeddedStripeCheckout from "@/components/commerce/EmbeddedStripeCheckout";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError } from "@/lib/auth";
import {
  embeddedCheckout,
  followCheckout,
  type Cart,
  type CheckoutPreview,
  type CheckoutResult,
} from "@/lib/commerce";
import { resolveUploadUrl } from "@/lib/mediaUrl";

export default function CartCheckoutPage() {
  return (
    <Suspense fallback={<p className="text-sm text-caisbe-muted">Loading payment…</p>}>
      <CartCheckoutInner />
    </Suspense>
  );
}

function CartCheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [quote, setQuote] = useState<CheckoutPreview | null>(null);
  const [lines, setLines] = useState<CheckoutLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stripePay, setStripePay] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const cancelled = searchParams.get("cancelled") === "1";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [preview, cart] = await Promise.all([
          apiFetch<CheckoutPreview>("/me/checkout/preview", {
            method: "POST",
            body: JSON.stringify({ from_cart: true }),
          }),
          apiFetch<Cart>("/me/cart"),
        ]);
        if (!active) return;
        setQuote(preview);
        const byCourse = new Map(cart.items.map((item) => [item.course_id, item]));
        setLines(
          (preview.items ?? []).map((item) => {
            const cartItem = item.course_id ? byCourse.get(item.course_id) : undefined;
            const cover = cartItem?.cover_url
              ? resolveUploadUrl(cartItem.cover_url) ?? cartItem.cover_url
              : null;
            return {
              id: String(item.course_id ?? item.title),
              title: item.title,
              meta: cartItem?.course_code,
              priceCents: item.unit_price_cents,
              coverUrl: cover,
            };
          }),
        );
      } catch (err) {
        if (!active) return;
        const detail = err instanceof ApiError ? err.detail : "Unable to load payment.";
        setError(/empty|select at least/i.test(detail) ? "Your cart is empty." : detail);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<CheckoutResult>("/me/checkout", {
        method: "POST",
        body: JSON.stringify({ from_cart: true }),
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
      const detail = err instanceof ApiError ? err.detail : "Unable to start payment.";
      setError(
        /already enrolled/i.test(detail)
          ? "You already have one of these courses. Remove it from the cart and try the others."
          : detail,
      );
    } finally {
      setBusy(false);
    }
  }

  const complimentary = Boolean(quote?.complimentary || quote?.total_cents === 0);

  return (
    <div className="space-y-6">
      <BackButton href="/cart" />

      {cancelled ? (
        <div className="border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          Checkout was cancelled. Your cart is unchanged — try again when ready.
        </div>
      ) : null}
      {error ? (
        <div className="border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          <p>{error}</p>
          {error === "Your cart is empty." ? (
            <Link href="/courses" className="mt-2 inline-flex font-semibold underline">
              Browse courses
            </Link>
          ) : null}
        </div>
      ) : null}

      {quote ? (
        <CheckoutDesk
          lines={lines}
          currency={quote.currency}
          subtotalCents={quote.subtotal_cents}
          discountCents={quote.discount_cents}
          totalCents={quote.total_cents}
          studentName={user?.full_name?.trim() || "Student"}
          complimentary={complimentary}
          cardReady={Boolean(quote.card_payments_ready)}
          busy={busy}
          onPay={() => void pay()}
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
        <p className="text-sm text-caisbe-muted">Loading payment…</p>
      )}
    </div>
  );
}
