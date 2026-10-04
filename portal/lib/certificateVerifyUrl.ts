/** Absolute public URL encoded into certificate QR codes (phones cannot resolve relative paths). */
export function certificateVerifyUrl(
  certificateCode: string,
  apiVerifyUrl?: string | null,
): string {
  const code = (certificateCode || "").trim();
  if (!code) return "";

  const path = `/certificates/verify/${encodeURIComponent(code)}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  if (apiVerifyUrl && isAbsoluteHttpUrl(apiVerifyUrl)) {
    return apiVerifyUrl.trim();
  }

  const envBase = (process.env.NEXT_PUBLIC_PORTAL_URL || "").trim().replace(/\/$/, "");
  if (envBase && isAbsoluteHttpUrl(envBase)) {
    return `${envBase}${path}`;
  }

  return "";
}

export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
