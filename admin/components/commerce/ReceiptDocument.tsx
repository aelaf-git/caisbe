"use client";

export type ReceiptLine = {
  title: string;
  unit_price_cents: number;
  quantity?: number;
};

export type ReceiptDocumentProps = {
  studentName: string;
  studentEmail?: string | null;
  orderNumber: string;
  invoiceNumber?: string | null;
  issuedAt: string;
  currency?: string;
  items: ReceiptLine[];
  amountPaidCents: number;
  status?: string | null;
  method?: string | null;
};

const INSTITUTE = "Canada Africa Institute for the Sustainable Built Environment";

function formatMoney(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatIssueDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { dateStyle: "long" });
}

function lineTitle(title: string) {
  const cleaned = title.replace(/\s*\((memberships?)\)\s*$/i, "").trim();
  return cleaned || title;
}

function statusLabel(status?: string | null) {
  const value = (status || "").toLowerCase();
  if (value === "succeeded" || value === "paid") return "Paid";
  if (value === "refunded") return "Refunded";
  if (!value) return "Recorded";
  return value.replaceAll("_", " ");
}

function methodLabel(method?: string | null) {
  const value = (method || "").toLowerCase();
  if (!value) return null;
  if (value === "manual") return "Manual";
  if (value === "stripe") return "Card";
  return value.replaceAll("_", " ");
}

export default function ReceiptDocument({
  studentName,
  studentEmail,
  orderNumber,
  invoiceNumber,
  issuedAt,
  currency = "usd",
  items,
  amountPaidCents,
  status,
  method,
}: ReceiptDocumentProps) {
  const lines = items.length
    ? items
    : [{ title: "Payment", unit_price_cents: amountPaidCents, quantity: 1 }];
  const paid = statusLabel(status) === "Paid";
  const methodText = methodLabel(method);

  return (
    <article className="receipt-document mx-auto w-full max-w-[720px] bg-white text-[#1f2937] shadow-brand-card print:shadow-none">
      <div className="h-2 bg-[#7b1e3a]" />
      <div className="h-1 bg-[#c9a227]" />
      <div className="px-8 py-8 sm:px-10">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <img
              src="/images/logo.png"
              alt="CAISBE"
              width={2172}
              height={724}
              className="h-12 w-auto object-contain"
            />
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
            ) : (
              <p className="mt-3 text-sm font-semibold capitalize text-[#1f2937]">{statusLabel(status)}</p>
            )}
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

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="bg-[#7b1e3a] text-white">
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((item, index) => {
              const quantity = item.quantity || 1;
              return (
                <tr key={`${item.title}-${index}`} className="border-b border-[#e5e7eb]">
                  <td className="px-3 py-3">{lineTitle(item.title)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{quantity}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatMoney(item.unit_price_cents * quantity, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="text-sm text-[#5f6b7a]">
            {methodText ? <p>Method: <span className="font-medium capitalize text-[#1f2937]">{methodText}</span></p> : null}
            <p className="mt-1">Status: <span className="font-medium capitalize text-[#1f2937]">{statusLabel(status)}</span></p>
          </div>
          <dl className="w-full max-w-xs text-sm">
            <div className="flex justify-between gap-6 border-t-2 border-[#7b1e3a] pt-3">
              <dt className="font-semibold text-[#111827]">Amount paid</dt>
              <dd className="font-semibold tabular-nums text-[#111827]">
                {formatMoney(amountPaidCents, currency)}
              </dd>
            </div>
          </dl>
        </div>

        <footer className="mt-10 border-t border-[#e5e7eb] pt-4 text-xs leading-5 text-[#5f6b7a]">
          <p>Thank you. This receipt confirms payment received by CAISBE.</p>
          <p className="mt-1">815-4 Ave SW, Calgary, Alberta T2P 5N7, Canada · info@caisbe.org</p>
        </footer>
      </div>
    </article>
  );
}
