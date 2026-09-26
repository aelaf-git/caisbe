export const MEMBERSHIP_TYPES = [
  { id: "student", label: "Student Membership" },
  { id: "professional", label: "Professional Membership" },
  { id: "corporate", label: "Corporate Membership" },
  { id: "senior-fellow", label: "Senior Member / Fellow" },
  { id: "institutional", label: "Institutional Member" },
] as const;

export function membershipLabel(value?: string | null) {
  return MEMBERSHIP_TYPES.find((item) => item.id === value)?.label || value || "Not set";
}

export function money(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export const fieldClass =
  "h-11 w-full rounded-md border border-ifma-border bg-admin-surface px-3 text-sm text-caisbe-text outline-none focus:border-caisbe-red";
