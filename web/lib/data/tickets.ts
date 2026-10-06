import { portalUrl } from "@/lib/api";

export const ticketsContent = {
  slug: "tickets",
  eyebrow: "Resources",
  title: "Tickets",
  lead: "Log in to track the status of your existing support tickets.",
  body:
    "Online students can open tickets for IT and other technical issues with the learning portal, courses, exams, or account access. Our team reviews tickets in the admin inbox and replies in near real time.",
  ctaLabel: "Log in to view tickets",
  seoTitle: "Support Tickets | CAISBE",
  metaDescription:
    "Log in to open and track CAISBE support tickets for IT and technical issues affecting online students.",
};

export function ticketsPortalLoginUrl() {
  return portalUrl("/login?next=/messages");
}

export function ticketsPortalUrl() {
  return portalUrl("/messages");
}
