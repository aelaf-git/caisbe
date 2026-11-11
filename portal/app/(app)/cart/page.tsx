"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";
import { formatMoney, type Cart } from "@/lib/commerce";
import { IconActionButton } from "@/components/ui/IconAction";

export default function CartPage() {
  return (
    <Suspense fallback={<p className="text-sm text-caisbe-muted">Loading cart…</p>}>
      <CartInner />
    </Suspense>
  );
}

function CartInner() {
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
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
            className="inline-flex h-11 items-center rounded-none border-2 border-ifma-border px-5 text-sm font-bold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
          >
            Browse courses
          </Link>
        }
      />

      {cancelled ? (
        <div className="rounded-none border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          Checkout was cancelled. Your cart is unchanged — try again when ready.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-none border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </div>
      ) : null}

      {!cart ? (
        <p className="text-sm text-caisbe-muted">Loading cart…</p>
      ) : items.length === 0 ? (
        <section className="rounded-none bg-white p-6 shadow-hopewell">
          <p className="text-sm text-caisbe-muted">Your cart is empty.</p>
          <Link
            href="/courses"
            className="mt-4 inline-flex h-11 items-center rounded-none bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark"
          >
            Browse courses
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-none bg-white shadow-hopewell">
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
                  <IconActionButton
                    icon="trash"
                    tone="danger"
                    label={`Remove ${item.course_title} from cart`}
                    disabled={removingId === item.course_id}
                    onClick={() => void removeItem(item.course_id)}
                  />
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

          <section className="rounded-none border-2 border-caisbe-red/30 bg-white p-6 shadow-hopewell">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Payment
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">
              Buy cart courses
            </h2>
            <p className="mt-2 text-sm leading-6 text-caisbe-muted">
              Continue to payment options. Access unlocks after the card payment succeeds.
            </p>
            <p className="mt-4 text-lg font-semibold text-caisbe-text-dark">
              {formatMoney(cart.subtotal_cents, cart.currency)}
            </p>
            <Link
              href="/checkout"
              className="mt-5 inline-flex h-11 items-center rounded-none bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark"
            >
              {`Buy now · ${formatMoney(cart.subtotal_cents, cart.currency)}`}
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
