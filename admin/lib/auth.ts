const TOKEN_KEY = "caisbe_admin_access_token";

export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  role: "student" | "admin" | string;
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

export type AdminStudentEnrollment = {
  course_id: number;
  course_code: string;
  course_title: string;
  progress: number;
  status: string;
  enrolled_at: string;
};

export type AdminStudent = {
  id: number;
  full_name: string;
  email: string;
  enrollments: AdminStudentEnrollment[];
};

export type AdminEnrollment = {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  course_id: number;
  course_code: string;
  course_title: string;
  status: string;
  progress: number;
  enrolled_at: string;
};

export type AdminEnrollmentCourseStat = {
  course_id: number;
  course_code: string;
  course_title: string;
  enrollment_count: number;
  completed_count: number;
  average_progress: number;
};

export type AdminEnrollmentStats = {
  total_enrollments: number;
  in_progress: number;
  completed: number;
  not_started: number;
  completion_rate: number;
  new_last_30_days: number;
  by_course: AdminEnrollmentCourseStat[];
};

export type MediaAsset = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  cover_url: string | null;
  category: string;
  published: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
};

export type NewsletterSubscriber = {
  id: number;
  email: string;
  full_name: string | null;
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
};

export type NewsletterCampaign = {
  id: number;
  subject: string;
  recipient_count: number;
  sent_at: string;
};

export type AdminDashboard = {
  students: number;
  courses_total: number;
  courses_published: number;
  courses_draft: number;
  total_enrollments: number;
  enrollments_in_progress: number;
  enrollments_completed: number;
  completion_rate: number;
  certificates: number;
  newsletter_subscribers: number;
  newsletters_sent: number;
  magazines_published: number;
  site_views_today: number;
  site_unique_today: number;
  landing_views: number;
  landing_unique_visitors: number;
};

export type SiteVisit = {
  id: number;
  path: string;
  ip_address: string;
  country: string | null;
  city: string | null;
  referrer: string | null;
  user_agent: string | null;
  language: string | null;
  timezone: string | null;
  visited_at: string;
};

export type SiteVisitStats = {
  total_views: number;
  unique_visitors: number;
  landing_views: number;
  landing_unique_visitors: number;
  views_today: number;
  unique_today: number;
  views_last_7_days: number;
  unique_last_7_days: number;
  top_paths: { path: string; views: number }[];
  top_countries: { country: string; views: number }[];
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

export async function apiUpload(
  path: string,
  file: File,
): Promise<{ url: string; filename: string }> {
  const maxBytes = 500 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new ApiError(413, "File is too large. Maximum upload size is 500 MB.");
  }

  const headers = new Headers();
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const body = new FormData();
  body.append("file", file);

  // Prefer direct API upload so large files are not buffered/truncated by Next.js.
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  const url = apiBase ? `${apiBase}/api${path}` : `/api${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<{ url: string; filename: string }>;
}
