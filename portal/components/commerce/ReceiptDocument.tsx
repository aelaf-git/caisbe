"use client";

import BrandLogo from "@/components/layout/BrandLogo";
import { formatMoney, type OrderItemRow } from "@/lib/commerce";

export type ReceiptDocumentProps = {
  studentName: string;
  studentEmail?: string | null;
  orderNumber: string;
  invoiceNumber?: string | null;
  issuedAt: string;
  currency: string;
  items: OrderItemRow[];
  amountPaidCents: number;
  balanceCents: number;
  status?: string | null;
};

const INSTITUTE = "Canada Africa Institute for the Sustainable Built Environment";

function formatIssueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" });
}

function lineTitle(title: string) {
  const cleaned = title.replace(/\s*\((memberships?)\)\s*$/i, "").trim();
  return cleaned || title;
}

function statusLabel(status?: string | null) {
  const value = (status || "").toLowerCase();
  if (value === "succeeded" || value === "paid") return "Paid";
  if (value === "refunded") return "Refunded";
  if (!value) return null;
  return value.replaceAll("_", " ");
}

export default function ReceiptDocument({
  studentName,
  studentEmail,
  orderNumber,
  invoiceNumber,
  issuedAt,
  currency,
  items,
  amountPaidCents,
  balanceCents,
  status,
}: ReceiptDocumentProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price_cents * (item.quantity || 1),
    0,
  );
  const label = statusLabel(status);
  const paid = label === "Paid" || (balanceCents <= 0 && amountPaidCents > 0);

  return (
    <article className="receipt-document mx-auto w-full max-w-[720px] bg-white text-[#1f2937] shadow-brand-card print:shadow-none">
      <div className="h-2 bg-[#7b1e3a]" />
      <div className="h-1 bg-[#c9a227]" />
      <div className="px-8 py-8 sm:px-10">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <BrandLogo alt="CAISBE" className="h-12 text-[3rem]" />
            <p className="mt-3 max-w-xs text-xs leading-5 text-[#5f6b7a]">{INSTITUTE}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-display text-3xl font-semibold tracking-wide text-[#7b1e3a]">Receipt</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a227]">
              Official payment record
            </p>
            {paid ? (
              <p className="mt-3 inline-flex border-2 border-[#177245] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#177245]">
                Paid
              </p>
            ) : label ? (
              <p className="mt-3 text-sm font-semibold capitalize text-[#1f2937]">{label}</p>
            ) : null}
          </div>
        </header>

        <dl className="mt-8 grid gap-4 border-y border-[#e5e7eb] py-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#5f6b7a]">Receipt no.</dt>
            <dd className="mt-1 font-mono font-medium">{orderNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#5f6b7a]">Invoice</dt>
            <dd className="mt-1 font-mono font-medium">{invoiceNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#5f6b7a]">Date</dt>
            <dd className="mt-1 font-medium">{formatIssueDate(issuedAt)}</dd>
          </div>
        </dl>

        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#5f6b7a]">Billed to</h2>
          <p className="mt-1 text-lg font-semibold text-[#111827]">{studentName}</p>
          {studentEmail ? <p className="text-sm text-[#5f6b7a]">{studentEmail}</p> : null}
        </section>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="mt-6 min-w-[20rem] w-full text-left text-sm">
            <thead>
              <tr className="bg-[#7b1e3a] text-white">
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.title}-${index}`} className="border-b border-[#e5e7eb]">
                  <td className="px-3 py-3 break-words">{lineTitle(item.title)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{item.quantity || 1}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatMoney(item.unit_price_cents * (item.quantity || 1), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#5f6b7a]">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#5f6b7a]">Amount paid</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(amountPaidCents, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t-2 border-[#7b1e3a] pt-2">
            <dt className="font-semibold text-[#111827]">Balance</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(balanceCents, currency)}</dd>
          </div>
        </dl>

        <footer className="mt-10 border-t border-[#e5e7eb] pt-4 text-xs leading-5 text-[#5f6b7a]">
          <p>Thank you. This receipt confirms payment received by CAISBE.</p>
          <p className="mt-1">815-4 Ave SW, Calgary, Alberta T2P 5N7, Canada · info@caisbe.org</p>
        </footer>
      </div>
    </article>
  );
}
