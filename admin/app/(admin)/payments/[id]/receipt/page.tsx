"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReceiptDocument from "@/components/commerce/ReceiptDocument";
import { apiFetch, ApiError } from "@/lib/auth";
import { downloadReceiptPdf, receiptPdfFileName } from "@/lib/receiptPdf";

type ReceiptItem = {
  title: string;
  unit_price_cents: number;
  quantity: number;
};

type PaymentRow = {
  id: number;
  status: string;
  provider: string;
  amount_cents: number;
  created_at: string;
  order_number: string;
  student_name: string;
  student_email: string;
  course_title: string;
  currency?: string;
  invoice_number?: string | null;
  items?: ReceiptItem[];
};

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<PaymentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void apiFetch<PaymentRow>(`/admin/payments/${params.id}`)
      .then(setRow)
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Unable to load receipt."));
  }, [params.id]);

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
    const source = document.querySelector(".receipt-document");
    if (!(source instanceof HTMLElement) || !row) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadReceiptPdf(source, receiptPdfFileName(row.order_number || String(row.id)));
      try {
        const updated = await apiFetch<PaymentRow>(`/admin/payments/${params.id}/print`, { method: "POST" });
        setRow(updated);
      } catch {
        // The PDF is already saved. Recording the download can fail without blocking it.
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (error && !row) return <p className="text-sm text-caisbe-red">{error}</p>;
  if (!row) return <p className="text-sm text-caisbe-muted">Loading receipt…</p>;

  const items =
    row.items && row.items.length > 0
      ? row.items
      : [{ title: row.course_title || "Payment", unit_price_cents: row.amount_cents, quantity: 1 }];

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/payments" className="text-sm font-semibold text-caisbe-red hover:underline">
          Back to payments
        </Link>
      </div>
      <ReceiptDocument
        studentName={row.student_name}
        studentEmail={row.student_email}
        orderNumber={row.order_number}
        invoiceNumber={row.invoice_number}
        issuedAt={row.created_at}
        currency={row.currency || "usd"}
        items={items}
        amountPaidCents={row.amount_cents}
        status={row.status}
        method={row.provider}
      />
      <div className="mt-6 flex justify-center print:hidden">
        <button
          type="button"
          disabled={downloading}
          onMouseEnter={() => {
            void import("html2canvas-pro");
            void import("jspdf");
          }}
          onClick={() => void download()}
          className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
      {error ? <p className="mt-3 text-center text-sm text-caisbe-red">{error}</p> : null}
    </section>
  );
}
