/**
 * Resolve FastAPI base URLs for Next.js server-side proxies.
 * Never use public Cloudflare / onrender HTTPS from a Render service (Error 1000).
 */

export function normalizeApiBase(raw: string | undefined | null): string {
  let value = (raw || "http://127.0.0.1:8000").trim().replace(/\/$/, "");
  if (!value) value = "http://127.0.0.1:8000";

  // https://my-api.onrender.com → http://my-api:10000 (Render private network)
  const onrender = value.match(/^https?:\/\/([a-z0-9-]+)\.onrender\.com(?::\d+)?$/i);
  if (onrender) {
    return `http://${onrender[1]}:10000`;
  }

  // Custom public API hostname → production private service
  if (/^https?:\/\/(www\.)?api\.caisbe\.org(?::\d+)?$/i.test(value)) {
    return "http://caisbe-api:10000";
  }

  if (!/^https?:\/\//i.test(value)) {
    return "http://127.0.0.1:8000";
  }

  return value;
}

/** Ordered unique candidates. Configured private URL first; never public CF hosts. */
export function candidateApiBases(apiUrlEnv?: string | null): string[] {
  const configured = normalizeApiBase(
    apiUrlEnv === undefined ? process.env["API_URL"] : apiUrlEnv,
  );
  const out: string[] = [configured];

  const private10000 = configured.match(/^(http:\/\/[a-z0-9.-]+):10000$/i);
  if (private10000) {
    out.push(`${private10000[1]}:8000`);
  }

  return [...new Set(out)];
}
