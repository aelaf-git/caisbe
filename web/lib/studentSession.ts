const TOKEN_KEY = "caisbe_portal_access_token";

export type StudentUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
};

function sessionCookieDomain(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "caisbe.org" || host.endsWith(".caisbe.org")) return "; Domain=.caisbe.org";
  return "";
}

export function readStudentToken(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${TOKEN_KEY}=`;
  for (const part of document.cookie.split("; ")) {
    if (!part.startsWith(prefix)) continue;
    try {
      return decodeURIComponent(part.slice(prefix.length));
    } catch {
      return null;
    }
  }
  return null;
}

export function clearStudentToken(): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax${sessionCookieDomain()}${secure}`;
}

export class StudentApiError extends Error {
  detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "StudentApiError";
    this.detail = detail;
  }
}

export async function studentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = readStudentToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api${path}`, { ...init, headers, cache: "no-store" });
  if (response.status === 401) {
    clearStudentToken();
  }
  if (!response.ok) {
    let detail = "Unable to complete this request.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      // keep default
    }
    throw new StudentApiError(detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
