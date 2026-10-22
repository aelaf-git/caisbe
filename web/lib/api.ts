import { normalizeLocale, type Locale } from "@/lib/i18n";

export type MediaAsset = {
  id: number;
  title: string;
  description: string | null;
  file_url: string | null;
  cover_url: string | null;
  external_url: string | null;
  body: string | null;
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

export type LeadershipPerson = {
  id: number;
  name: string;
  role: string;
  credentials: string | null;
  bio: string | null;
  email: string | null;
  photo_url: string | null;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type NewsPost = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  external_url: string | null;
  cover_url: string | null;
  image_urls: string[];
  video_urls: string[];
  tag: string | null;
  source_label?: string | null;
  posted_on: string;
  published: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
  show_text_panel?: boolean;
  eyebrow?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  description?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
};

export type Seminar = {
  id: number;
  title: string;
  description: string;
  cover_url?: string | null;
  event_date_label?: string | null;
  event_time_label?: string | null;
  event_format_label?: string | null;
  venue_address?: string | null;
  online_join_url?: string | null;
  event_starts_at?: string | null;
  registration_closes_at?: string | null;
  registration_enabled?: boolean;
  member_price_cents?: number;
  non_member_price_cents?: number;
  student_price_cents?: number;
  capacity_in_person?: number | null;
  capacity_virtual?: number | null;
  published: boolean;
  sort_order: number;
};

export type Testimonial = {
  id: number;
  quote: string;
  name: string;
  role: string;
  published: boolean;
  sort_order: number;
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

/** Public content endpoints that accept `?lang=` and fall back to English. */
const LOCALIZED_PATHS = [
  "/site-pages/by-path",
  "/site-pages/nav",
  "/news",
  "/events",
  "/jobs",
  "/seminars",
  "/leadership",
  "/testimonials",
  "/media",
  "/courses",
  "/hero",
];

function isLocalizedPath(path: string): boolean {
  const pathname = path.split("?")[0];
  return LOCALIZED_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

let serverLocaleResolver: (() => Promise<Locale>) | null = null;

/**
 * Registered once by the root layout so server-side fetches can read the locale cookie
 * without this (client-reachable) module importing `next/headers`.
 */
export function registerServerLocaleResolver(resolver: () => Promise<Locale>) {
  serverLocaleResolver = resolver;
}

export async function requestLocale(): Promise<Locale> {
  if (typeof window !== "undefined") {
    return normalizeLocale(document.documentElement.lang);
  }
  try {
    return serverLocaleResolver ? await serverLocaleResolver() : "en";
  } catch {
    return "en";
  }
}

/** Append `lang=fr` for localized public endpoints when the visitor reads French. */
async function withLocale(path: string, locale?: Locale): Promise<string> {
  if (!isLocalizedPath(path) || /[?&]lang=/.test(path)) return path;
  const active = locale ?? (await requestLocale());
  if (active !== "fr") return path;
  return `${path}${path.includes("?") ? "&" : "?"}lang=fr`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { locale?: Locale },
): Promise<T> {
  const { locale, ...fetchInit } = init ?? {};
  const localizedPath = await withLocale(path, locale);
  const response = await fetch(`${apiBaseForFetch()}${localizedPath}`, {
    ...fetchInit,
    headers: {
      "Content-Type": "application/json",
      ...fetchInit.headers,
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

export async function fetchPublishedMedia(
  category: string,
  options?: { featured?: boolean; locale?: Locale },
): Promise<MediaAsset[]> {
  const params = new URLSearchParams({ category });
  if (options?.featured) params.set("featured", "true");
  return apiFetch<MediaAsset[]>(`/media?${params.toString()}`, { locale: options?.locale });
}

export async function fetchPublishedMagazines(options?: {
  featured?: boolean;
  locale?: Locale;
}): Promise<MediaAsset[]> {
  return fetchPublishedMedia("magazine", options);
}

export async function fetchPublishedForms(options?: {
  featured?: boolean;
  locale?: Locale;
}): Promise<MediaAsset[]> {
  return fetchPublishedMedia("forms", options);
}

export async function fetchPublishedMediaAsset(
  id: number,
  locale?: Locale,
): Promise<MediaAsset> {
  return apiFetch<MediaAsset>(`/media/${id}`, { locale });
}

export async function fetchPublishedEvents(options?: {
  featured?: boolean;
  eventType?: string;
  locale?: Locale;
}): Promise<IndustryEvent[]> {
  const params = new URLSearchParams();
  if (options?.featured) params.set("featured", "true");
  if (options?.eventType) params.set("event_type", options.eventType);
  const query = params.toString();
  return apiFetch<IndustryEvent[]>(`/events${query ? `?${query}` : ""}`, {
    locale: options?.locale,
  });
}

export async function fetchActiveJobs(options?: {
  featured?: boolean;
  locale?: Locale;
}): Promise<JobPosting[]> {
  const params = new URLSearchParams();
  if (options?.featured) params.set("featured", "true");
  const query = params.toString();
  return apiFetch<JobPosting[]>(`/jobs${query ? `?${query}` : ""}`, {
    locale: options?.locale,
  });
}

export async function fetchJob(
  jobId: number,
  locale?: Locale,
): Promise<JobPosting> {
  return apiFetch<JobPosting>(`/jobs/${jobId}`, { locale });
}

export async function fetchPublishedSeminars(locale?: Locale): Promise<Seminar[]> {
  return apiFetch<Seminar[]>("/seminars", { locale });
}

export async function fetchPublishedSeminar(
  seminarId: number,
  locale?: Locale,
): Promise<Seminar> {
  return apiFetch<Seminar>(`/seminars/${seminarId}`, { locale });
}

export async function fetchPublishedTestimonials(locale?: Locale): Promise<Testimonial[]> {
  return apiFetch<Testimonial[]>("/testimonials", { locale });
}

export async function fetchPublishedLeadership(locale?: Locale): Promise<LeadershipPerson[]> {
  return apiFetch<LeadershipPerson[]>("/leadership", { locale });
}

export async function fetchPublishedNews(options?: {
  featured?: boolean;
  locale?: Locale;
}): Promise<NewsPost[]> {
  const params = new URLSearchParams();
  if (options?.featured) params.set("featured", "true");
  const query = params.toString();
  return apiFetch<NewsPost[]>(`/news${query ? `?${query}` : ""}`, {
    locale: options?.locale,
  });
}

export async function fetchPublishedNewsBySlug(
  slug: string,
  locale?: Locale,
): Promise<NewsPost> {
  return apiFetch<NewsPost>(`/news/${encodeURIComponent(slug)}`, { locale });
}

export async function fetchHeroCarousel(): Promise<HeroCarousel> {
  return apiFetch<HeroCarousel>("/hero");
}

export async function fetchPublishedCourses(locale?: Locale): Promise<Course[]> {
  return apiFetch<Course[]>("/courses", { locale });
}

export function courseProgramPath(slug: string) {
  return `/professional-development/${slug}`;
}

export function courseEnrollUrl(courseId: number) {
  return portalUrl(`/courses/${courseId}/checkout`);
}

/** Portal login that returns the visitor to course checkout after they sign in. */
export function courseRegisterLoginUrl(courseId: number) {
  return portalUrl(
    `/login?next=${encodeURIComponent(`/courses/${courseId}/checkout`)}`,
  );
}

export function portalUrl(path = "") {
  const portal = (
    process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002"
  ).replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${portal}${suffix}`;
}

export function portalMembershipRegisterUrl() {
  return portalUrl("/register?next=/membership");
}

export function portalMembershipLoginUrl() {
  return portalUrl("/login?next=/membership");
}

export async function subscribeNewsletter(payload: {
  email: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/newsletter/subscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function unsubscribeNewsletter(payload: {
  token: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/newsletter/unsubscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
