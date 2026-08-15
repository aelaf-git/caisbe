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
