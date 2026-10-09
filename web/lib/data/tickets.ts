import { portalUrl } from "@/lib/api";

export const ticketsContent = {
  slug: "tickets",
  eyebrow: "Resources",
  title: "Tickets",
  lead: "Sign in to see your support tickets or submit a new one.",
  signedInLead: "Your open and closed support tickets.",
  emptyLead: "You don't have any support tickets yet.",
  tableHeaders: ["Ticket", "Status", "Submitted"] as const,
  loginCtaLabel: "Log in",
  submitCtaLabel: "Submit a ticket",
  seoTitle: "Support Tickets | CAISBE",
  metaDescription:
    "Sign in to see your CAISBE support tickets or submit a new one.",
};

export function ticketsPortalLoginUrl(nextPath = "/messages") {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return portalUrl(`/login?next=${encodeURIComponent(next)}`);
}

export function ticketsPortalUrl() {
  return portalUrl("/messages");
}

export function ticketsPortalComposeUrl() {
  return portalUrl("/messages?compose=1");
}
