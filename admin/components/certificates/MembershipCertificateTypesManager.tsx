"use client";

import { useEffect, useMemo, useState } from "react";
import MembershipCertificateDocument from "@/components/certificates/MembershipCertificateDocument";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import SaveButton from "@/components/ui/SaveButton";
import Skeleton from "@/components/ui/Skeleton";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, ApiError, type MembershipCertificateType } from "@/lib/auth";

const CURRENCIES = ["cad", "usd"] as const;
type CertificateCurrency = (typeof CURRENCIES)[number];

function normalizeCurrency(value: string | null | undefined): CertificateCurrency {
  return value?.trim().toLowerCase() === "usd" ? "usd" : "cad";
}

function formatMoney(cents: number, currency = "cad") {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function portalBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002").replace(/\/$/, "");
}

function renderBody(template: string, issuedBy: string, issuedAt: string) {
  return template
    .replaceAll("{issued_by}", issuedBy)
    .replaceAll("{issued_at}", issuedAt);
}

function addMonthsIso(iso: string, months: number): string {
  const date = new Date(iso);
  const year = date.getFullYear() + Math.floor((date.getMonth() + months) / 12);
  const month = (date.getMonth() + months) % 12;
  const day = Math.min(
    date.getDate(),
    new Date(year, month + 1, 0).getDate(),
  );
  date.setFullYear(year, month, day);
  return date.toISOString();
}

export default function MembershipCertificateTypesManager({
  items,
  loading,
  onRefresh,
  onError,
  onSuccess,
}: {
  items: MembershipCertificateType[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState<CertificateCurrency>("cad");
  const [validityMonths, setValidityMonths] = useState("12");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => {
    if (selectedId != null) {
      return items.find((item) => item.id === selectedId) ?? null;
    }
    return items[0] ?? null;
  }, [items, selectedId]);

  const isStudentType = selected?.membership_type === "student";

  const formValues = useMemo(() => {
    const parsedPrice = isStudentType ? 0 : Number(price);
    const parsedMonths = Number(validityMonths);
    return {
      label: label.trim(),
      title: title.trim(),
      body: body.trim(),
      price_cents: Number.isFinite(parsedPrice) ? Math.round(parsedPrice * 100) : null,
      currency,
      validity_months: isStudentType
        ? null
        : Number.isFinite(parsedMonths)
          ? Math.max(1, Math.round(parsedMonths))
          : null,
      active,
    };
  }, [label, title, body, price, currency, validityMonths, active, isStudentType]);

  const { dirty, resetBaseline } = useDirtyForm(formValues);

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setLabel(selected.label);
    setTitle(selected.title);
    setBody(selected.body);
    const student = selected.membership_type === "student";
    setPrice(student ? "0.00" : (selected.price_cents / 100).toFixed(2));
    setCurrency(normalizeCurrency(selected.currency));
    setValidityMonths(
      student ? "" : String(selected.validity_months && selected.validity_months > 0 ? selected.validity_months : 12),
    );
    setActive(selected.active);
    resetBaseline({
      label: selected.label,
      title: selected.title,
      body: selected.body,
      price_cents: student ? 0 : selected.price_cents,
      currency: normalizeCurrency(selected.currency),
      validity_months: student ? null : selected.validity_months && selected.validity_months > 0 ? selected.validity_months : 12,
      active: selected.active,
    });
  }, [
    selected?.id,
    selected?.label,
    selected?.title,
    selected?.body,
    selected?.price_cents,
    selected?.currency,
    selected?.validity_months,
    selected?.active,
    selected?.membership_type,
    resetBaseline,
  ]);

  function loadItem(item: MembershipCertificateType) {
    setSelectedId(item.id);
  }

  const issuedAtIso = new Date().toISOString();
  const issuedLabel = new Date(issuedAtIso).toLocaleDateString(undefined, { dateStyle: "long" });
  const previewBody = renderBody(body || selected?.body || "", "CAISBE", issuedLabel);
  const previewValidUntil = useMemo(() => {
    if (isStudentType) return null;
    const months = Number(validityMonths);
    if (!Number.isFinite(months) || months < 1) return null;
    return addMonthsIso(issuedAtIso, Math.round(months));
  }, [isStudentType, validityMonths, issuedAtIso]);

  async function handleSave() {
    if (!selected || !dirty) return;
    const parsedPrice = isStudentType ? 0 : Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      onError("Enter a valid certificate price.");
      return;
    }
    const parsedMonths = Number(validityMonths);
    if (!isStudentType && (!Number.isFinite(parsedMonths) || parsedMonths < 1)) {
      onError("Enter a validity period of at least 1 month.");
      return;
    }
    if (!label.trim() || !title.trim() || !body.trim()) {
      onError("Label, title, and body are required.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/admin/membership-certificate-types/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: label.trim(),
          title: title.trim(),
          body: body.trim(),
          price_cents: isStudentType ? 0 : Math.round(parsedPrice * 100),
          currency,
          ...(isStudentType ? {} : { validity_months: Math.round(parsedMonths) }),
          active,
        }),
      });
      onSuccess(`${label.trim()} certificate updated.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save certificate type.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Skeleton className="h-72 rounded-[20px]" />
        <Skeleton className="h-72 rounded-[20px]" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title="No membership certificate types"
        description="Membership certificate types will appear here once they are seeded."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card padding="none" className="overflow-hidden">
        <ul className="divide-y divide-ifma-border-light">
          {items.map((item) => {
            const isActive = (selected?.id ?? null) === item.id;
            const lifetime = item.membership_type === "student" || item.validity_months == null;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => loadItem(item)}
                  className={`w-full px-5 py-4 text-left transition-colors ${
                    isActive ? "bg-caisbe-red/5" : "hover:bg-admin-surface-muted/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-caisbe-text-dark">{item.label}</p>
                      <p className="mt-1 text-sm text-caisbe-muted">{item.title}</p>
                      <p className="mt-1 text-xs text-caisbe-muted">
                        {lifetime ? "Lifetime" : `Valid ${item.validity_months} months`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-caisbe-text-dark">
                        {item.membership_type === "student"
                          ? "Free"
                          : formatMoney(item.price_cents, item.currency)}
                      </p>
                      <Badge className="mt-2" tone={item.active ? "success" : "neutral"}>
                        {item.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {selected ? (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <h2 className="font-hopewell-display text-xl font-extrabold text-caisbe-text-dark">
                {selected.label}
              </h2>
              <p className="mt-1 text-sm text-caisbe-muted">
                Membership type code: <span className="font-mono">{selected.membership_type}</span>
              </p>
            </div>

            <FormField label="Display label">
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={fieldClassName} />
            </FormField>
            <FormField label="Certificate title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClassName} />
            </FormField>
            <FormField
              label="Certificate body"
              hint="Use {issued_by} and {issued_at} placeholders."
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className={textAreaClassName}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Price"
                hint={isStudentType ? "Student membership is always free." : "Amount members pay for this certificate."}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={fieldClassName}
                  disabled={isStudentType}
                  readOnly={isStudentType}
                />
              </FormField>
              <FormField label="Currency" hint="Switch between CAD and USD.">
                <div
                  role="group"
                  aria-label="Currency"
                  className="flex h-11 w-full overflow-hidden rounded-full border border-ifma-border bg-admin-surface p-1"
                >
                  {CURRENCIES.map((option) => {
                    const selectedCurrency = currency === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selectedCurrency}
                        onClick={() => setCurrency(option)}
                        className={`flex-1 rounded-full text-sm font-semibold uppercase tracking-wide transition-colors ${
                          selectedCurrency
                            ? "bg-caisbe-red text-white"
                            : "text-caisbe-muted hover:text-caisbe-text"
                        }`}
                      >
                        {option.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </FormField>
            </div>
            {isStudentType ? (
              <FormField label="Validity" hint="Student membership has no expiry.">
                <input value="Lifetime (no expiry)" className={fieldClassName} disabled readOnly />
              </FormField>
            ) : (
              <FormField
                label="Validity (months)"
                hint="Shown on the certificate as Valid until. Default is 12 months (1 year)."
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={validityMonths}
                  onChange={(e) => setValidityMonths(e.target.value)}
                  className={fieldClassName}
                />
              </FormField>
            )}
            <label className="flex items-center gap-2 text-sm text-caisbe-text">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-ifma-border text-caisbe-red"
              />
              Active for this membership type
            </label>
            <SaveButton
              dirty={dirty}
              saving={saving}
              idleLabel="Save certificate"
              onClick={() => void handleSave()}
            />
          </Card>

          <Card className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-caisbe-muted">
              Preview ·{" "}
              {isStudentType
                ? "Free · Lifetime"
                : `${formatMoney(
                    Number.isFinite(Number(price)) ? Math.round(Number(price) * 100) : selected.price_cents,
                    currency || selected.currency,
                  )} · ${validityMonths || "12"} months`}
            </h3>
            <div className="overflow-x-auto rounded-[20px] bg-admin-surface-muted/60 p-3 sm:p-5">
              <div className="inline-block min-w-[900px]">
                <MembershipCertificateDocument
                  studentName="Jane Doe"
                  membershipNumber="CAISBE-M-000001"
                  issuedAt={issuedAtIso}
                  validUntil={previewValidUntil}
                  verifyUrl={`${portalBaseUrl()}/certificates/verify/CAISBE-MEM-SAMPLE01`}
                  certificateCode="CAISBE-MEM-SAMPLE01"
                  title={title || selected.title}
                  body={previewBody}
                />
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
