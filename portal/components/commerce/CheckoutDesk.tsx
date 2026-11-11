import Link from "next/link";
import type { ReactNode } from "react";
import { formatMoney } from "@/lib/commerce";

export type CheckoutLine = {
  id: string;
  title: string;
  meta?: string;
  priceCents: number;
  coverUrl?: string | null;
};

type CheckoutDeskProps = {
  lines: CheckoutLine[];
  currency: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  studentName: string;
  complimentary: boolean;
  cardReady: boolean;
  busy: boolean;
  disabled?: boolean;
  onPay: () => void;
};

function LockIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function VisaMark() {
  return (
    <span className="inline-flex h-5 items-center rounded-sm bg-[#1a1f71] px-1.5 text-[9px] font-bold tracking-wide text-white">
      VISA
    </span>
  );
}

function MastercardMark() {
  return (
    <span className="inline-flex h-5 w-8 items-center justify-center" aria-hidden>
      <svg viewBox="0 0 32 20" className="h-5 w-8">
        <circle cx="12" cy="10" r="7" fill="#eb001b" />
        <circle cx="20" cy="10" r="7" fill="#f79e1b" />
        <path d="M16 4.8a7 7 0 0 1 0 10.4 7 7 0 0 1 0-10.4z" fill="#ff5f00" />
      </svg>
    </span>
  );
}

function AmexMark() {
  return (
    <span className="inline-flex h-5 items-center rounded-sm bg-[#2e77bc] px-1.5 text-[8px] font-bold tracking-wide text-white">
      AMEX
    </span>
  );
}

function CardBrandMarks() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden>
      <VisaMark />
      <MastercardMark />
      <AmexMark />
    </span>
  );
}

function Cover({ line }: { line: CheckoutLine }) {
  return (
    <span className="relative h-16 w-24 shrink-0 overflow-hidden border border-ifma-border bg-[#fafaf8]">
      {line.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={line.coverUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-caisbe-red">
          CAISBE
        </span>
      )}
    </span>
  );
}

function DetailSlot({
  label,
  value,
  hint,
  trailing,
  wide = false,
}: {
  label: string;
  value: string;
  hint?: string;
  trailing?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{label}</p>
      <div className="mt-2 flex min-h-12 items-center justify-between gap-3 border border-ifma-border bg-[#fafafa] px-3.5 text-sm text-caisbe-text-dark">
        <span className="truncate text-caisbe-muted">{value}</span>
        {trailing}
      </div>
      {hint ? <p className="mt-1.5 text-xs leading-5 text-caisbe-muted">{hint}</p> : null}
    </div>
  );
}

export default function CheckoutDesk({
  lines,
  currency,
  subtotalCents,
  discountCents,
  totalCents,
  studentName,
  complimentary,
  cardReady,
  busy,
  disabled = false,
  onPay,
}: CheckoutDeskProps) {
  const needsCard = !complimentary;
  const payDisabled = disabled || busy || (needsCard && !cardReady);
  const money = (cents: number) => formatMoney(cents, currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-caisbe-text-dark">Checkout</h1>
        <p className="inline-flex items-center gap-1.5 border border-ifma-border bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-text-dark">
          <LockIcon />
          Secure checkout
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
        <div className="space-y-6">
          <section className="border border-ifma-border bg-white p-5 shadow-hopewell md:p-6">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Cart summary</h2>
            <ul className="mt-4 divide-y divide-ifma-border-light">
              {lines.map((line) => (
                <li key={line.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <Cover line={line} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-caisbe-text-dark">{line.title}</p>
                    {line.meta ? <p className="mt-1 text-sm text-caisbe-muted">{line.meta}</p> : null}
                  </div>
                  <p className="shrink-0 font-semibold text-caisbe-text-dark">{money(line.priceCents)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-ifma-border-light pt-4 text-sm">
              <p className="text-caisbe-text">
                <span className="text-caisbe-muted">Student</span>{" "}
                <span className="font-semibold text-caisbe-text-dark">{studentName}</span>
              </p>
              <Link href="/account" className="font-semibold text-caisbe-red hover:underline">
                Change
              </Link>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-ifma-border-light pt-4">
              <span className="font-semibold text-caisbe-text-dark">Total</span>
              <span className="text-lg font-semibold text-caisbe-text-dark">{money(totalCents)}</span>
            </div>
          </section>

          <section className="border border-ifma-border bg-white p-5 shadow-hopewell md:p-6">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Choose payment method</h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-2 border-caisbe-red bg-caisbe-red/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-caisbe-text-dark">Credit / debit card</p>
                <p className="mt-0.5 text-xs text-caisbe-muted">Visa, Mastercard, American Express</p>
              </div>
              <CardBrandMarks />
            </div>

            {complimentary ? (
              <p className="mt-4 text-sm leading-6 text-caisbe-muted">
                This order has no charge. Confirm to enroll.
              </p>
            ) : (
              <>
                <h3 className="mt-6 text-sm font-semibold text-caisbe-text-dark">Card details</h3>
                <p className="mt-1 text-sm leading-6 text-caisbe-muted">
                  {cardReady
                    ? "Complete purchase to enter the card number, name, expiry, and CVV on the secure Stripe page. CAISBE does not store the card."
                    : "CAISBE is connecting Stripe. Card payment is not available yet, so this course stays locked."}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailSlot
                    label="Card number"
                    value="•••• •••• •••• ••••"
                    trailing={<CardBrandMarks />}
                    wide
                  />
                  <DetailSlot label="Name on card" value={studentName} />
                  <DetailSlot label="Expiry date" value="MM / YY" />
                  <DetailSlot label="CVV" value="•••" hint="3-digit code on the back of your card" />
                </div>
              </>
            )}

            <button
              type="button"
              disabled={payDisabled}
              onClick={onPay}
              className="mt-6 inline-flex h-12 w-full items-center justify-center bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
            >
              {busy ? "Continuing…" : complimentary ? "Complete enrollment" : "Complete purchase"}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-caisbe-muted">
              Secure payment by Stripe. You’ll receive a confirmation email after purchase.
            </p>
          </section>
        </div>

        <aside className="border border-ifma-border bg-white p-5 shadow-hopewell md:p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Order summary</h2>
          <ul className="mt-4 space-y-4">
            {lines.map((line) => (
              <li key={`summary-${line.id}`} className="flex items-start gap-3">
                <Cover line={line} />
                <div className="min-w-0">
                  <p className="font-semibold text-caisbe-text-dark">{line.title}</p>
                  {line.meta ? <p className="mt-1 text-xs text-caisbe-muted">{line.meta}</p> : null}
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-ifma-border-light pt-4 text-sm">
            <div className="flex justify-between text-caisbe-muted">
              <dt>Subtotal</dt>
              <dd>{money(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between text-caisbe-muted">
              <dt>Discount</dt>
              <dd>{money(discountCents)}</dd>
            </div>
            <div className="flex justify-between text-caisbe-muted">
              <dt>Tax</dt>
              <dd>{money(0)}</dd>
            </div>
            <div className="flex justify-between border-t border-ifma-border-light pt-3 text-base font-semibold text-caisbe-red">
              <dt>Total</dt>
              <dd>{money(totalCents)}</dd>
            </div>
          </dl>
          <div className="mt-5 border border-ifma-border bg-[#fafafa] p-4">
            <p className="text-sm font-semibold text-caisbe-text-dark">Receipt after payment</p>
            <p className="mt-1 text-sm leading-6 text-caisbe-muted">
              The course opens after payment succeeds. A confirmation email includes the PDF receipt.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
