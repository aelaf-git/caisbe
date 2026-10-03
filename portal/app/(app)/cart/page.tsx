"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";
import { formatMoney, type Cart, type CheckoutResult } from "@/lib/commerce";

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
  const { refreshUser } = useAuth();
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
    void loadCart().catch((err) => {
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

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<CheckoutResult>("/me/checkout", {
        method: "POST",
        body: JSON.stringify({ from_cart: true }),
      });
      await refreshUser();
      router.push(`/checkout/success?order=${result.order_number}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to complete purchase.");
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learning"
        title="Cart"
        description="Review your courses, then buy once to unlock everything in the cart."
        actions={
          <Link
            href="/courses"
            className="inline-flex h-11 items-center rounded-full border-2 border-ifma-border px-5 text-sm font-bold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
          >
            Browse courses
          </Link>
        }
      />

      {cancelled ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          Checkout was cancelled. Your cart is unchanged — try again when ready.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </div>
      ) : null}

      {!cart ? (
        <p className="text-sm text-caisbe-muted">Loading cart…</p>
      ) : items.length === 0 ? (
        <section className="rounded-[20px] bg-white p-6 shadow-hopewell">
          <p className="text-sm text-caisbe-muted">Your cart is empty.</p>
          <Link
            href="/courses"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark"
          >
            Browse courses
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-[20px] bg-white shadow-hopewell">
            <div className="border-b border-ifma-border-light px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                {items.length} course{items.length === 1 ? "" : "s"}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-caisbe-text-dark">
                Order summary
              </h2>
            </div>
            <ul className="divide-y divide-ifma-border-light">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                      {item.course_code}
                    </p>
                    <p className="font-medium text-caisbe-text">{item.course_title}</p>
                    <p className="mt-1 text-sm text-caisbe-muted">
                      {formatMoney(item.price_cents, item.currency)}
                    </p>
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
            <div className="flex items-center justify-between border-t border-ifma-border-light px-6 py-4">
              <span className="text-sm font-semibold text-caisbe-text-dark">Subtotal</span>
              <span className="text-lg font-semibold text-caisbe-text-dark">
                {formatMoney(cart.subtotal_cents, cart.currency)}
              </span>
            </div>
          </section>

          <section className="rounded-[20px] border-2 border-caisbe-red/30 bg-white p-6 shadow-hopewell">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Payment
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">
              Buy cart courses
            </h2>
            <p className="mt-2 text-sm leading-6 text-caisbe-muted">
              Confirm to purchase every course in this cart. Access unlocks immediately after you buy.
            </p>
            <p className="mt-4 text-lg font-semibold text-caisbe-text-dark">
              {formatMoney(cart.subtotal_cents, cart.currency)}
            </p>
            <p className="mt-1 text-xs text-caisbe-muted">
              Card checkout via Stripe will be added next. For now, buy to enroll in all cart courses.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void buy()}
              className="mt-5 inline-flex h-11 items-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
            >
              {busy ? "Buying…" : `Buy now · ${formatMoney(cart.subtotal_cents, cart.currency)}`}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
