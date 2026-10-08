"use client";

import { formatMoney, type OrderItemRow } from "@/lib/commerce";

export type ReceiptDocumentProps = {
  studentName: string;
  orderNumber: string;
  invoiceNumber?: string | null;
  issuedAt: string;
  currency: string;
  items: OrderItemRow[];
  amountPaidCents: number;
  balanceCents: number;
};

function formatIssueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" });
}

export default function ReceiptDocument({
  studentName,
  orderNumber,
  invoiceNumber,
  issuedAt,
  currency,
  items,
  amountPaidCents,
  balanceCents,
}: ReceiptDocumentProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price_cents * (item.quantity || 1),
    0,
  );

  return (
    <article className="receipt-document mx-auto w-full max-w-[720px] bg-white px-8 py-10 text-caisbe-text shadow-brand-card print:shadow-none">
      <header className="flex items-start justify-between gap-6 border-b border-ifma-border pb-6">
        <div>
          <img
            src="/images/logo.png"
            alt="CAISBE"
            width={2172}
            height={724}
            className="h-10 w-auto object-contain"
          />
          <p className="mt-4 font-display text-2xl font-semibold text-caisbe-text-dark">Receipt</p>
        </div>
        <dl className="text-right text-sm">
          <div>
            <dt className="text-caisbe-muted">Invoice</dt>
            <dd className="font-mono font-medium">{invoiceNumber || "—"}</dd>
          </div>
          <div className="mt-2">
            <dt className="text-caisbe-muted">Order</dt>
            <dd className="font-mono font-medium">{orderNumber}</dd>
          </div>
          <div className="mt-2">
            <dt className="text-caisbe-muted">Date</dt>
            <dd className="font-medium">{formatIssueDate(issuedAt)}</dd>
          </div>
        </dl>
      </header>

      <p className="mt-6 text-sm">
        <span className="text-caisbe-muted">Billed to </span>
        <span className="font-semibold text-caisbe-text-dark">{studentName}</span>
      </p>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ifma-border text-caisbe-muted">
            <th className="py-2 pr-4 font-semibold">Description</th>
            <th className="py-2 pr-4 text-right font-semibold">Qty</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.title}-${index}`} className="border-b border-ifma-border-light">
              <td className="py-3 pr-4">{item.title}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{item.quantity || 1}</td>
              <td className="py-3 text-right tabular-nums">
                {formatMoney(item.unit_price_cents * (item.quantity || 1), currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-caisbe-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-caisbe-muted">Amount paid</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(amountPaidCents, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-ifma-border pt-2">
          <dt className="font-semibold text-caisbe-text-dark">Balance</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(balanceCents, currency)}</dd>
        </div>
      </dl>
    </article>
  );
}
