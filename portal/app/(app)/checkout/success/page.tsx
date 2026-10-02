"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import { formatMoney, type OrderRow } from "@/lib/commerce";

function SuccessInner() {
  const search = useSearchParams();
  const orderNumber = search.get("order");
  const sessionId = search.get("session_id");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (sessionId) {
          const confirmed = await apiFetch<OrderRow>(
            `/me/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`,
            { method: "POST" },
          );
          if (active) setOrder(confirmed);
          return;
        }
        if (orderNumber) {
          const data = await apiFetch<OrderRow>(`/me/orders/${orderNumber}`);
          if (active) setOrder(data);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Payment is still processing. Check My orders shortly.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [orderNumber, sessionId]);

  const itemCount = order?.items?.length ?? 0;
  const headline =
    itemCount > 1 ? `You are enrolled in ${itemCount} courses` : "You are enrolled";

  return (
    <div className="mx-auto max-w-xl space-y-4 border border-ifma-border bg-admin-surface p-8 text-center">
      <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">{headline}</h1>
      <p className="text-sm text-caisbe-muted">
        Payment succeeded and course access is unlocked. Admin can still print a receipt from the back office.
      </p>
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {order ? (
        <div className="space-y-2 text-sm text-caisbe-text">
          <p>
            Order {order.number} · {formatMoney(order.total_cents, order.currency)} · {order.status}
          </p>
          {order.items && order.items.length > 0 ? (
            <ul className="space-y-1 text-left">
              {order.items.map((item) => (
                <li key={item.course_id} className="border border-ifma-border-light px-3 py-2">
                  {item.title}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link
          href="/courses"
          className="inline-flex h-11 items-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white"
        >
          Go to my courses
        </Link>
        <Link
          href="/account"
          className="inline-flex h-11 items-center rounded-md border-2 border-ifma-border px-5 text-sm font-semibold uppercase tracking-wide text-caisbe-text"
        >
          View invoices
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<p className="text-sm text-caisbe-muted">Loading…</p>}>
      <SuccessInner />
    </Suspense>
  );
}
