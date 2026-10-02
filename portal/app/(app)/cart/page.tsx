"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import ProfileForm, { profileFromUser } from "@/components/portal/ProfileForm";
import { apiFetch, ApiError } from "@/lib/auth";
import {
  STRIPE_PROMO_HINT,
  formatMoney,
  type Cart,
  type CheckoutResult,
} from "@/lib/commerce";

export default function CartPage() {
  return (
    <Suspense fallback={<p className="text-sm text-caisbe-muted">Loading cart…</p>}>
      <CartInner />
    </Suspense>
  );
}

function CartInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const cancelled = searchParams.get("cancelled") === "1";

  async function loadCart() {
    const data = await apiFetch<Cart>("/me/cart");
    setCart(data);
  }

  useEffect(() => {
    let active = true;
    void loadCart()
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load cart.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function removeItem(courseId: number) {
    setRemovingId(courseId);
    setError(null);
    try {
      await apiFetch(`/me/cart/${courseId}`, { method: "DELETE" });
      await loadCart();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to remove item.");
    } finally {
      setRemovingId(null);
    }
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<CheckoutResult>("/me/checkout", {
        method: "POST",
        body: JSON.stringify({ from_cart: true }),
      });
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
      router.push(`/checkout/success?order=${result.order_number}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to start checkout.");
      try {
        await loadCart();
      } catch {
        // ignore reload failure
      }
    } finally {
      setBusy(false);
    }
  }

  const items = cart?.items ?? [];
  const complimentary = (cart?.subtotal_cents ?? 0) === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Cart</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          Add courses from My courses, then pay once with Stripe. Discount codes are entered on the Stripe page.
        </p>
      </div>

      {cancelled ? (
        <p className="text-sm text-caisbe-red">Checkout was cancelled. Your cart is unchanged — try again when ready.</p>
      ) : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      {!cart ? (
        <p className="text-sm text-caisbe-muted">Loading cart…</p>
      ) : items.length === 0 ? (
        <section className="border border-ifma-border bg-admin-surface p-6">
          <p className="text-sm text-caisbe-muted">Your cart is empty.</p>
          <Link href="/courses" className="mt-3 inline-flex text-sm font-semibold text-caisbe-red hover:underline">
            Browse courses
          </Link>
        </section>
      ) : (
        <>
          <section className="border border-ifma-border bg-admin-surface">
            <ul className="divide-y divide-ifma-border-light">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{item.course_code}</p>
                    <p className="font-medium text-caisbe-text">{item.course_title}</p>
                    <p className="mt-1 text-sm text-caisbe-muted">{formatMoney(item.price_cents, item.currency)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={removingId === item.course_id}
                    onClick={() => void removeItem(item.course_id)}
                    className="text-sm font-semibold text-caisbe-red hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-ifma-border-light px-6 py-4 text-sm font-semibold">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotal_cents, cart.currency)}</span>
            </div>
          </section>

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
              {!complimentary ? (
                <p className="text-sm text-caisbe-muted">{STRIPE_PROMO_HINT}</p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void pay()}
                className="inline-flex h-12 items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:opacity-60"
              >
                {busy
                  ? "Processing…"
                  : complimentary
                    ? "Confirm complimentary enrollment"
                    : `Pay with card · ${formatMoney(cart.subtotal_cents, cart.currency)}`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
