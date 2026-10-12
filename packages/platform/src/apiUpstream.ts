/**
 * Resolve FastAPI base URLs for Next.js server-side proxies.
 * Never use public Cloudflare / onrender HTTPS from a Render service (Error 1000).
 */

export const UPSTREAM_FETCH_TIMEOUT_MS = 12_000;
export const UPSTREAM_COLD_START_RETRIES = 2;
export const UPSTREAM_RETRY_DELAY_MS = 500;

export function normalizeApiBase(raw: string | undefined | null): string {
  let value = (raw || "http://127.0.0.1:8000").trim();
  if (!value) value = "http://127.0.0.1:8000";

  // Strip trailing slashes and accidental `/api` path (proxies already prefix `/api/...`).
  value = value.replace(/\/+$/, "");
  value = value.replace(/\/api$/i, "");

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

  // Render private services listen on 10000; local/docker often use 8000.
  const hostPort = configured.match(/^(http:\/\/[a-z0-9.-]+):(\d+)$/i);
  if (hostPort) {
    const host = hostPort[1];
    const port = hostPort[2];
    if (port === "10000") out.push(`${host}:8000`);
    else if (port === "8000") out.push(`${host}:10000`);
  }

  return [...new Set(out)];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
