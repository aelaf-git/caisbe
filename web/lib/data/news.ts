export const newsContent = {
  eyebrow: "News & Announcements",
  title: "News & Announcements",
  lead:
    "Updates from CAISBE programs, events, partnerships, and the professional community across Africa and Canada.",
  intro:
    "Stay informed about institute initiatives, upcoming forums, membership milestones, and opportunities to get involved.",
};

export function formatNewsDate(isoDate: string, locale: "en" | "fr" = "en") {
  const value = isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
