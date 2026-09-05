export function outlineNumber(...parts: number[]): string {
  return parts.filter((n) => Number.isFinite(n) && n > 0).join(".");
}
