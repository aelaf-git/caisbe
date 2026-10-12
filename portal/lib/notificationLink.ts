const PUBLIC_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://caisbe.org").replace(/\/$/, "");
const PORTAL_SITE = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");

function siteBase(value: string, fallback: string) {
  if (!value || /localhost|127\.0\.0\.1/i.test(value)) return fallback;
  return value;
}

/** Keep "Open related page" off localhost when a notification stored a local absolute URL. */
export function relatedPageHref(link: string): string {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return link;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0") return link;
  const suffix = `${url.pathname}${url.search}${url.hash}`;
  if (url.port === "3002") {
    return `${siteBase(PORTAL_SITE, "https://portal.caisbe.org")}${suffix}`;
  }
  return `${siteBase(PUBLIC_SITE, "https://caisbe.org")}${suffix}`;
}
