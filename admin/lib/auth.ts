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
  price_cents?: number;
  has_unpublished_changes?: boolean;
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
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  organization?: string | null;
  job_title?: string | null;
  membership_date?: string | null;
  membership_type?: string | null;
  membership_status?: string;
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

export type IndustryEvent = {
  id: number;
  title: string;
  summary: string | null;
  location: string | null;
  region: string | null;
  event_type: string;
  starts_on: string;
  ends_on: string | null;
  source_name: string | null;
  source_url: string | null;
  report_file_url: string | null;
  cpd_hours: number | null;
  published: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CpdActivity = {
  id: number;
  activity: string;
  category: string;
  hours_reported: number;
  hours_approved: number;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type JobPosting = {
  id: number;
  title: string;
  company: string | null;
  location: string | null;
  employment_type: string;
  summary: string | null;
  description: string | null;
  apply_url: string | null;
  attachment_url: string | null;
  source_label: string | null;
  posted_on: string;
  expires_on: string;
  published: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_expired: boolean;
};

export type NewsletterSubscriber = {
  id: number;
  email: string;
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
  membership_certificates?: number;
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
  location_country?: string;
  location_city?: string;
  city: string | null;
  referrer: string | null;
  user_agent: string | null;
  language: string | null;
  timezone: string | null;
  visited_at: string;
};

export type SiteVisitDaily = {
  date: string;
  views: number;
  unique: number;
};

export type SiteVisitCountryStat = {
  country: string;
  views: number;
  unique?: number;
};

export type SiteVisitNamedStat = {
  label: string;
  views: number;
  unique?: number;
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
  previous_views: number | null;
  previous_unique: number | null;
  top_paths: { path: string; views: number }[];
  top_countries: SiteVisitCountryStat[];
  daily: SiteVisitDaily[];
  countries: SiteVisitCountryStat[];
  cities: SiteVisitNamedStat[];
  referrers: SiteVisitNamedStat[];
  browsers: SiteVisitNamedStat[];
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

async function parseError(response: Response): Promise<ApiError> {
  try {
    const text = await response.text();
    return parseErrorDetail(response.status, text);
  } catch {
    return new ApiError(response.status, `Request failed (${response.status})`);
  }
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

export type ApiUploadOptions = {
  onProgress?: (percent: number) => void;
};

export async function apiUpload(
  path: string,
  file: File,
  options?: ApiUploadOptions,
): Promise<{ url: string; filename: string }> {
  const maxBytes = 500 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new ApiError(413, "File is too large. Maximum upload size is 500 MB.");
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  const url = apiBase ? `${apiBase}/api${path}` : `/api${path}`;
  const token = getToken();
  const body = new FormData();
  body.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

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

    xhr.send(body);
  });
}
