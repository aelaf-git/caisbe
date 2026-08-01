const TOKEN_KEY = "caisbe_portal_access_token";

export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  role: "student" | "admin" | string;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  password: string;
};

export type Course = {
  id: number;
  code: string;
  title: string;
  description: string;
  slug: string;
  status?: string;
  cover_url?: string | null;
  pass_percent?: number;
};

export type Enrollment = {
  id: number;
  status: string;
  progress: number;
  enrolled_at: string;
  course: Course;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let detail = `Request failed (${response.status})`;
  try {
    const data = (await response.json()) as { detail?: string | { msg?: string }[] };
    if (typeof data.detail === "string") {
      detail = data.detail;
    } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      detail = data.detail[0].msg;
    }
  } catch {
    // keep default
  }
  return new ApiError(response.status, detail);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (init?.auth !== false) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiUpload(
  path: string,
  file: File,
): Promise<{ url: string; filename: string }> {
  const headers = new Headers();
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`/api${path}`, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<{ url: string; filename: string }>;
}
