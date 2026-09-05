const WORDS = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
  "Twenty",
];

export function numberedTitle(prefix: string, index: number): string {
  const n = index + 1;
  if (n >= 1 && n <= WORDS.length) {
    return `${prefix} ${WORDS[n - 1]}`;
  }
  return `${prefix} ${n}`;
}

export function outlineNumber(...parts: number[]): string {
  return parts.filter((n) => Number.isFinite(n) && n > 0).join(".");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
