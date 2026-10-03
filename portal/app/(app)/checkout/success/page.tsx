"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
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
        if (active) {
          setError(
            err instanceof ApiError ? err.detail : "Payment is still processing. Check My orders shortly.",
          );
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [orderNumber, sessionId]);

  const isMembership = Boolean(order?.items?.some((item) => item.membership_type));
  const itemCount = order?.items?.length ?? 0;
  const headline = isMembership
    ? "Membership payment complete"
    : itemCount > 1
      ? `You are enrolled in ${itemCount} courses`
      : "Purchase complete";
  const body = isMembership
    ? "Your membership certificate is ready to download from Membership."
    : "Course access is unlocked. Open My courses to start learning.";

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Checkout" title={headline} description={body} />

      {error ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </div>
      ) : null}

      <section className="rounded-[20px] bg-white p-6 shadow-hopewell">
        {order ? (
          <div className="space-y-4">
            <p className="text-sm text-caisbe-muted">
              Order {order.number} · {formatMoney(order.total_cents, order.currency)} ·{" "}
              <span className="capitalize">{order.status}</span>
            </p>
            {order.items && order.items.length > 0 ? (
              <ul className="divide-y divide-ifma-border-light rounded-md border border-ifma-border-light">
                {order.items.map((item, index) => (
                  <li
                    key={`${item.course_id ?? item.membership_type ?? "item"}-${index}`}
                    className="px-4 py-3 text-sm text-caisbe-text"
                  >
                    {item.title}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-caisbe-muted">Loading order…</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {isMembership ? (
            <Link
              href="/membership"
              className="inline-flex h-11 items-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark"
            >
              View membership
            </Link>
          ) : (
            <Link
              href="/courses"
              className="inline-flex h-11 items-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark"
            >
              Go to my courses
            </Link>
          )}
        </div>
      </section>
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
