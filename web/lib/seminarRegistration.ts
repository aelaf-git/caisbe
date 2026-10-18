export const POSITION_OPTIONS = [
  "Property Manager",
  "Facility Manager",
  "Building Engineer / Systems Technician",
  "Asset Manager",
  "Portfolio Manager",
  "Sustainability / Energy Manager",
  "Operations Director",
  "Building Owner / Investor",
  "Real Estate Consultant",
  "Emerging Professional / Student",
  "Other (please specify)",
] as const;

export type MembershipStatus = "association_member" | "non_member" | "student";
export type AttendancePreference = "in_person" | "virtual";

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
