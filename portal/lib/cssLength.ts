/** Integer pixel length safe to interpolate into a style element. */
export function cssPx(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const pixels = Math.trunc(value);
  if (pixels < 0) return "0";
  return String(pixels);
}
