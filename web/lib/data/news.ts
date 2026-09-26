export type NewsItem = {
  date: string;
  title: string;
  excerpt: string;
  tag?: string;
};

export const newsContent = {
  eyebrow: "News & Announcements",
  title: "News & Announcements",
  lead:
    "Updates from CAISBE programs, events, partnerships, and the professional community across Africa and Canada.",
  intro:
    "Stay informed about institutes initiatives, upcoming forums, membership milestones, and opportunities to get involved.",
  items: [
    {
      date: "2026-03-12",
      title: "Membership registration and renewal forms now available",
      excerpt:
        "New and renewing members can complete CAISBE application and renewal forms online and print copies for records.",
      tag: "Membership",
    },
    {
      date: "2026-02-20",
      title: "Africa–Canada Built Environment Expo planning underway",
      excerpt:
        "Planning continues for the Expo & Forum bringing together leaders, practitioners, and partners from both regions.",
      tag: "Events",
    },
    {
      date: "2026-01-28",
      title: "Professional development pathways expanded",
      excerpt:
        "Certificate programs and learning formats continue to support facility and property management careers.",
      tag: "Learning",
    },
    {
      date: "2025-12-10",
      title: "Office locations and contact channels refreshed",
      excerpt:
        "Visit our Contact page for updated Canada and Africa office details, maps, and directions.",
      tag: "Institute",
    },
  ] satisfies NewsItem[],
};

export function formatNewsDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${isoDate}T12:00:00`));
}
