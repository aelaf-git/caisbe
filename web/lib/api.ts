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

export type Course = {
  id: number;
  code: string;
  title: string;
  description: string;
  slug: string;
  status: string;
  cover_url: string | null;
  pass_percent: number;
  price_cents: number;
  currency: string;
};

export type HeroSlide = {
  id: number | string;
  title: string;
  file_url: string;
  media_type: "image" | "video" | string;
};

export type HeroCarousel = {
  transition_ms: number;
  slides: HeroSlide[];
};

const API_BASE = "/api";

function apiBaseForFetch(): string {
  if (typeof window === "undefined") {
    return (
      (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "") + "/api"
    );
  }
  return API_BASE;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseForFetch()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as {
        detail?: string | { msg?: string }[];
      };
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
        detail = data.detail[0].msg;
      }
    } catch {
      // keep default
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchPublishedMagazines(options?: {
  featured?: boolean;
}): Promise<MediaAsset[]> {
  const params = new URLSearchParams({ category: "magazine" });
  if (options?.featured) params.set("featured", "true");
  return apiFetch<MediaAsset[]>(`/media?${params.toString()}`);
}

export async function fetchPublishedEvents(options?: {
  featured?: boolean;
  eventType?: string;
}): Promise<IndustryEvent[]> {
  const params = new URLSearchParams();
  if (options?.featured) params.set("featured", "true");
  if (options?.eventType) params.set("event_type", options.eventType);
  const query = params.toString();
  return apiFetch<IndustryEvent[]>(`/events${query ? `?${query}` : ""}`);
}

export async function fetchPublishedCpdActivities(): Promise<CpdActivity[]> {
  return apiFetch<CpdActivity[]>("/cpd-activities");
}

export async function fetchActiveJobs(options?: {
  featured?: boolean;
}): Promise<JobPosting[]> {
  const params = new URLSearchParams();
  if (options?.featured) params.set("featured", "true");
  const query = params.toString();
  return apiFetch<JobPosting[]>(`/jobs${query ? `?${query}` : ""}`);
}

export async function fetchHeroCarousel(): Promise<HeroCarousel> {
  return apiFetch<HeroCarousel>("/hero");
}

export async function fetchPublishedCourses(): Promise<Course[]> {
  return apiFetch<Course[]>("/courses");
}

export function courseProgramPath(slug: string) {
  return `/professional-development/${slug}`;
}

export function courseEnrollUrl(courseId: number) {
  const portal = (
    process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002"
  ).replace(/\/$/, "");
  return `${portal}/courses/${courseId}/checkout`;
}

export async function subscribeNewsletter(payload: {
  email: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/newsletter/subscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
