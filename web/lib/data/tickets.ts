import { portalUrl } from "@/lib/api";

export const ticketsContent = {
  slug: "tickets",
  eyebrow: "Resources",
  title: "Tickets",
  lead: "Log in to track the status of your existing support tickets.",
  tableHeaders: ["Ticket", "Issue", "Date submitted", "Number"] as const,
  tableEmpty:
    "Your open and closed tickets appear here after you log in. Use the button above to access your ticket history.",
  submitTitle: "Submit Your Ticket",
  submitBody: "Submit a support ticket to report an issue or resolve a question.",
  loginCtaLabel: "Log in to view tickets",
  submitCtaLabel: "Submit a ticket",
  seoTitle: "Support Tickets | CAISBE",
  metaDescription:
    "Log in to track CAISBE support tickets, or submit a ticket for IT and technical issues affecting online students.",
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
