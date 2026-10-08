export const membershipApplicationCopy = {
  dues: "Dues/One-year membership. CAISBE membership is individually based, and is nontransferable or refundable.",
  returnTo:
    "Return completed form with payment to: CAISBE, 815 4 AVE SW, Calgary, AB T2B 5N7, CANADA; or",
  email: "info@caisbe.org",
  organizationHint:
    "If full-time student, list college or university name and number of course hours enrolled",
  agreement:
    "By completing this membership application you agree to adhere to the CAISBE bylaws and code of ethics. For a complete copy of bylaws and code of ethics, visit CAISBE.org. Membership fees to CAISBE are not deductible as a charitable contribution for income tax purposes, but may be partially deductible as an ordinary business expense.",
};

export const baseMembershipOptions = [
  { id: "professional", api: "professional", name: "Professional" },
  { id: "senior", api: "senior-fellow", name: "Senior member" },
  { id: "student", api: "student", name: "Student" },
  { id: "institutional", api: "institutional", name: "Institutional" },
  { id: "corporate", api: "corporate", name: "Corporate" },
] as const;

export const chapterMembershipOptions = [
  { id: "professional", label: "Professional" },
  { id: "senior", label: "Senior member" },
  { id: "student", label: "Student" },
  { id: "institutional", label: "Institution" },
  { id: "corporate", label: "Corporate" },
] as const;

export const additionalMembershipOptions = [
  { id: "africa", label: "Africa wide Membership (CAD 65)" },
  { id: "comesa", label: "COMESA Practice Membership" },
  { id: "magazine", label: "Mailed copy of CAISBE magazine (CAD 48)" },
] as const;

export type BaseMembershipId = (typeof baseMembershipOptions)[number]["id"];
export type AdditionalMembershipId = (typeof additionalMembershipOptions)[number]["id"];

export type MembershipCertificateTypePublic = {
  membership_type: string;
  label: string;
  price_cents: number;
  currency: string;
  validity_months: number | null;
  sort_order: number;
};

export function formatMembershipPrice(priceCents: number, currency = "cad"): string {
  if (priceCents <= 0) return "Free";
  const code = currency.toUpperCase();
  const amount = (priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2);
  return `${code} ${amount}`;
}

export function baseMembershipLabel(
  option: (typeof baseMembershipOptions)[number],
  prices: MembershipCertificateTypePublic[] | null | undefined,
): string {
  const match = prices?.find((row) => row.membership_type === option.api);
  if (!match) return option.name;
  return `${option.name}: ${formatMembershipPrice(match.price_cents, match.currency)}`;
}

export function withBaseMembershipLabels(
  prices: MembershipCertificateTypePublic[] | null | undefined,
): {
  id: BaseMembershipId;
  api: string;
  label: string;
  name: string;
  priceLabel: string;
  priceCents: number | null;
  currency: string;
}[] {
  return baseMembershipOptions.map((option) => {
    const match = prices?.find((row) => row.membership_type === option.api);
    const priceCents = match ? match.price_cents : null;
    const currency = match?.currency || "cad";
    return {
      id: option.id,
      api: option.api,
      name: option.name,
      label: baseMembershipLabel(option, prices),
      priceLabel:
        priceCents == null ? "—" : formatMembershipPrice(priceCents, currency),
      priceCents,
      currency,
    };
  });
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${base}${suffix}`;
}

const SAFE_NEXT_PATH =
  /^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*)?\/?(?:\?[A-Za-z0-9._~%=&+-]*)?(?:#[A-Za-z0-9._~%-]*)?$/;

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  if (value !== value.trim()) return fallback;
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /%(?:2f|5c|00)/i.test(value)
  ) {
    return fallback;
  }
  if (!SAFE_NEXT_PATH.test(value)) return fallback;
  return value;
}
