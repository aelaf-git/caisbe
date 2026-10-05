const TOKEN_KEY = "caisbe_portal_access_token";

export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  address?: string | null;
  organization?: string | null;
  job_title?: string | null;
  membership_date?: string | null;
  membership_type?: string | null;
  membership_status?: string;
  profile_completed?: boolean;
  role: "student" | "admin" | string;
  pending_membership_type?: string | null;
  pending_membership_kind?: string | null;
  pending_membership_price_cents?: number | null;
  pending_membership_currency?: string | null;
  pending_membership_label?: string | null;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  password: string;
  given_name?: string | null;
  family_name?: string | null;
  address?: string | null;
  organization?: string | null;
  job_title?: string | null;
  membership_type?: string | null;
  details?: string | null;
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
  price_cents?: number;
  currency?: string;
};

export type Enrollment = {
  id: number;
  status: string;
  progress: number;
  enrolled_at: string;
  course: Course;
  exam_passed?: boolean;
  certificate_code?: string | null;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type RegisterPendingResponse = {
  message: string;
  email: string;
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
    const text = await response.text();
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/html") || text.trimStart().startsWith("<!")) {
      return new ApiError(
        response.status,
        "Unable to reach the server. Please try again in a moment.",
      );
    }
    const data = JSON.parse(text) as { detail?: string | { msg?: string }[] };
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
  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
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

  const text = await response.text();
  if (!text.trim()) {
    throw new ApiError(response.status, "Empty response from server.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, "Invalid response from server.");
  }
}

function parseErrorDetail(status: number, text: string): ApiError {
  let detail = `Request failed (${status})`;
  try {
    const data = JSON.parse(text) as { detail?: string | { msg?: string }[] };
    if (typeof data.detail === "string") {
      detail = data.detail;
    } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      detail = data.detail[0].msg;
    }
  } catch {
    // keep default
  }
  return new ApiError(status, detail);
}

export type ApiUploadOptions = {
  onProgress?: (percent: number) => void;
  /** Client-side size guard; API may still enforce a lower limit. */
  maxBytes?: number;
};

export async function apiUpload(
  path: string,
  file: File,
  options?: ApiUploadOptions,
): Promise<{ url: string; filename: string }> {
  const maxBytes = options?.maxBytes ?? 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new ApiError(
      413,
      `File is too large. Maximum upload size is ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    );
  }

  // Same-origin /api proxy — avoid cross-origin XHR (generic "Network error").
  const url = `/api${path}`;
  const token = getToken();
  const body = new FormData();
  body.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = 10 * 60 * 1000;

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!options?.onProgress || !event.lengthComputable || event.total <= 0) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      options.onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options?.onProgress?.(100);
        try {
          resolve(JSON.parse(xhr.responseText) as { url: string; filename: string });
        } catch {
          reject(new ApiError(xhr.status, "Invalid response from server."));
        }
        return;
      }
      reject(parseErrorDetail(xhr.status, xhr.responseText || ""));
    };

    xhr.onerror = () => {
      reject(new ApiError(0, "Network error while uploading file."));
    };
    xhr.ontimeout = () => {
      reject(new ApiError(0, "Upload timed out. Try a smaller file or retry."));
    };

    xhr.send(body);
  });
}
