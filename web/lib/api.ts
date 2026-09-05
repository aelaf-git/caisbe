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

const API_BASE = "/api";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
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

export async function subscribeNewsletter(payload: {
  email: string;
  full_name?: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/newsletter/subscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
