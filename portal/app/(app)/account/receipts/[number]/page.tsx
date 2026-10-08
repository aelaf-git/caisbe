"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import ReceiptDocument from "@/components/commerce/ReceiptDocument";
import BackButton from "@/components/ui/BackButton";
import { apiFetch, ApiError } from "@/lib/auth";
import type { OrderRow } from "@/lib/commerce";
import { downloadReceiptPdf, receiptPdfFileName } from "@/lib/receiptPdf";

export default function ReceiptPage() {
  const params = useParams<{ number: string }>();
  const { user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await apiFetch<OrderRow>(`/me/orders/${encodeURIComponent(params.number)}`);
        if (active) setOrder(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Receipt not found.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [params.number]);

  useEffect(() => {
    function onBeforePrint() {
      if (document.querySelector(".receipt-print-root")) return;
      const source = document.querySelector(".receipt-document");
      if (!(source instanceof HTMLElement)) return;
      const frame = document.createElement("div");
      frame.className = "receipt-print-root";
      frame.appendChild(source.cloneNode(true));
      document.body.appendChild(frame);
    }
    function onAfterPrint() {
      document.querySelector(".receipt-print-root")?.remove();
    }
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      document.querySelector(".receipt-print-root")?.remove();
    };
  }, []);

  async function download() {
    const source = receiptRef.current?.querySelector(".receipt-document");
    if (!(source instanceof HTMLElement) || !order) return;
    setDownloading(true);
    try {
      await downloadReceiptPdf(source, receiptPdfFileName(order.number));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="print:p-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 portrait; margin: 12mm; }
              html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
              body > *:not(.receipt-print-root) { display: none !important; }
              .receipt-print-root { display: block !important; }
              .receipt-document { box-shadow: none !important; max-width: none !important; }
            }
          `,
        }}
      />
      <div className="print:hidden">
        <BackButton href="/account" label="Back to account" />
      </div>

      {error ? <p className="mt-6 text-sm text-caisbe-red">{error}</p> : null}
      {!order && !error ? <p className="mt-6 text-sm text-caisbe-muted">Loading receipt…</p> : null}

      {order ? (
        <>
          <div ref={receiptRef} className="mt-6 print:mt-0">
            <ReceiptDocument
              studentName={user?.full_name || "Student"}
              orderNumber={order.number}
              invoiceNumber={order.invoice_number}
              issuedAt={order.created_at}
              currency={order.currency}
              items={order.items ?? []}
              amountPaidCents={order.amount_paid_cents}
              balanceCents={order.balance_cents}
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-11 items-center rounded-full border-2 border-ifma-border bg-white px-6 text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => void download()}
              disabled={downloading}
              className="inline-flex h-11 items-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
            >
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
