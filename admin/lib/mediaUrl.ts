/** Resolve stored upload URLs for browser use (R2 absolute or same-origin /api proxy). */
export function resolveUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/api/")) return trimmed;
  if (trimmed.startsWith("/uploads/")) return `/api${trimmed}`;
  if (trimmed.startsWith("/")) return trimmed;
  return `/api/uploads/${trimmed}`;
}
