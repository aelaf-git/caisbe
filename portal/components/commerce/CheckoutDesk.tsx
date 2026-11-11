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

function WordMark({ text, className }: { text: string; className: string }) {
  const tone = className.includes("text-") ? className : `${className} text-white`;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-[8px] font-bold tracking-wide ${tone}`}
      aria-hidden
    >
      {text}
    </span>
  );
}

const PAYMENT_GROUPS: { title: string; methods: { label: string; mark: ReactNode }[] }[] = [
  {
    title: "Cards",
    methods: [
      { label: "Visa", mark: <VisaMark /> },
      { label: "Mastercard", mark: <MastercardMark /> },
      { label: "American Express", mark: <AmexMark /> },
      { label: "Discover", mark: <WordMark text="DISC" className="bg-[#f76b1c] text-white" /> },
      { label: "JCB", mark: <WordMark text="JCB" className="bg-[#0e4c96] text-white" /> },
      { label: "UnionPay", mark: <WordMark text="UP" className="bg-[#e21836] text-white" /> },
      { label: "Diners Club", mark: <WordMark text="DC" className="bg-[#0079be] text-white" /> },
    ],
  },
  {
    title: "Wallets",
    methods: [
      { label: "Apple Pay", mark: <WordMark text="Pay" className="bg-black" /> },
      { label: "Google Pay", mark: <WordMark text="GPay" className="bg-[#3c4043]" /> },
      { label: "Link", mark: <WordMark text="Link" className="bg-[#00d66f] text-[#0a2540]" /> },
      { label: "Cash App", mark: <WordMark text="Cash" className="bg-[#00d632] text-black" /> },
      { label: "Amazon Pay", mark: <WordMark text="AMZN" className="bg-[#232f3e]" /> },
      { label: "PayPal", mark: <WordMark text="PP" className="bg-[#003087]" /> },
    ],
  },
  {
    title: "Pay later",
    methods: [
      { label: "Klarna", mark: <WordMark text="K" className="bg-[#ffa8cd] text-black" /> },
      { label: "Affirm", mark: <WordMark text="Af" className="bg-[#0f0c0c] text-white" /> },
      { label: "Afterpay", mark: <WordMark text="AP" className="bg-[#b2fce4] text-black" /> },
    ],
  },
  {
    title: "Bank",
    methods: [
      { label: "US bank account", mark: <WordMark text="ACH" className="bg-[#0a2540] text-white" /> },
      { label: "Canadian pre-authorized debit", mark: <WordMark text="PAD" className="bg-[#c42032] text-white" /> },
      { label: "SEPA", mark: <WordMark text="SEPA" className="bg-[#003399] text-white" /> },
      { label: "iDEAL", mark: <WordMark text="iD" className="bg-[#c06] text-white" /> },
      { label: "Bancontact", mark: <WordMark text="BC" className="bg-[#005498] text-white" /> },
    ],
  },
  {
    title: "Other",
    methods: [
      { label: "Alipay", mark: <WordMark text="ALI" className="bg-[#1677ff]" /> },
      { label: "WeChat Pay", mark: <WordMark text="WX" className="bg-[#07c160]" /> },
      { label: "Pix", mark: <WordMark text="PIX" className="bg-[#32bcad]" /> },
      { label: "Boleto", mark: <WordMark text="BOL" className="bg-[#0a2540]" /> },
      { label: "OXXO", mark: <WordMark text="OX" className="bg-[#e10600]" /> },
      { label: "Konbini", mark: <WordMark text="KB" className="bg-[#e60012]" /> },
      { label: "PromptPay", mark: <WordMark text="PPY" className="bg-[#1e4598]" /> },
      { label: "GrabPay", mark: <WordMark text="GRAB" className="bg-[#00b14f]" /> },
      { label: "FPX", mark: <WordMark text="FPX" className="bg-[#003da5]" /> },
      { label: "EPS", mark: <WordMark text="EPS" className="bg-[#c8102e]" /> },
      { label: "Przelewy24", mark: <WordMark text="P24" className="bg-[#d03238]" /> },
      { label: "BLIK", mark: <WordMark text="BLIK" className="bg-[#000]" /> },
      { label: "Multibanco", mark: <WordMark text="MB" className="bg-[#1b3b6f]" /> },
      { label: "MB WAY", mark: <WordMark text="MBW" className="bg-[#d61f26]" /> },
      { label: "Swish", mark: <WordMark text="SW" className="bg-[#3c3c8d]" /> },
      { label: "TWINT", mark: <WordMark text="TW" className="bg-[#000]" /> },
      { label: "MobilePay", mark: <WordMark text="MP" className="bg-[#5a78ff]" /> },
      { label: "Naver Pay", mark: <WordMark text="NV" className="bg-[#03c75a]" /> },
      { label: "Kakao Pay", mark: <WordMark text="KK" className="bg-[#ffcd00] text-black" /> },
      { label: "Samsung Pay", mark: <WordMark text="SAM" className="bg-[#1428a0]" /> },
      { label: "Revolut Pay", mark: <WordMark text="REV" className="bg-[#191c1f]" /> },
      { label: "Zip", mark: <WordMark text="ZIP" className="bg-[#aa8fff] text-black" /> },
      { label: "Alma", mark: <WordMark text="ALMA" className="bg-[#fa5022]" /> },
      { label: "Billie", mark: <WordMark text="BIL" className="bg-[#1a1a1a]" /> },
      { label: "Satispay", mark: <WordMark text="SAT" className="bg-[#ff3d00]" /> },
      { label: "PayNow", mark: <WordMark text="PN" className="bg-[#7c1a7c]" /> },
      { label: "KrCard", mark: <WordMark text="KR" className="bg-[#e31c23]" /> },
      { label: "Payco", mark: <WordMark text="PCO" className="bg-[#ff2233]" /> },
      { label: "AU BECS", mark: <WordMark text="BECS" className="bg-[#012169]" /> },
      { label: "Bacs", mark: <WordMark text="BACS" className="bg-[#0b1f3a]" /> },
      { label: "Crypto", mark: <WordMark text="BTC" className="bg-[#f7931a] text-black" /> },
    ],
  },
];

function MethodChip({ label, mark }: { label: string; mark: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 border border-caisbe-red bg-caisbe-red/5 px-2.5 py-1.5 text-xs font-semibold text-caisbe-text-dark">
      {mark}
      {label}
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
            {complimentary ? (
              <p className="mt-4 text-sm leading-6 text-caisbe-muted">
                This order has no charge. Confirm to enroll.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                {PAYMENT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{group.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.methods.map((method) => (
                        <MethodChip key={method.label} label={method.label} mark={method.mark} />
                      ))}
                    </div>
                    {group.title === "Cards" ? (
                      <>
                        <p className="mt-4 text-sm leading-6 text-caisbe-muted">
                          {cardReady
                            ? "Complete purchase to choose a method on the secure Stripe page. Card number, name, expiry, and CVV are entered there. CAISBE does not store the card. Apple Pay and Google Pay are offered with cards."
                            : "CAISBE is connecting Stripe. These methods stay unavailable until the account is connected, so this course stays locked."}
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
                    ) : null}
                  </div>
                ))}
              </div>
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
              Secure payment by Stripe. Stripe shows each method your account and currency allow. You’ll receive a confirmation email after purchase.
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
