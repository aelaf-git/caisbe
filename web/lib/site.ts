import { heroIntro } from "@/lib/data/home";

const PRODUCTION_ORIGIN = "https://caisbe.org";

export function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!raw) return PRODUCTION_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    return PRODUCTION_ORIGIN;
  }
}

/** Opening of the homepage intro, kept near a typical search snippet length. */
const homeLead = heroIntro.split(" — ")[0].trim();
export const homeDescription = homeLead.endsWith(".") ? homeLead : `${homeLead}.`;

export const homeTitle = "Facility and Property Management Education for Africa | CAISBE";
