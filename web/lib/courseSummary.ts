function plainTextFromHtml(description: string): string {
  return description
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|section|article)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .replace(/\s+([.!?])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .trim();
}

function sameWords(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return normalize(left) === normalize(right);
}

/** Plain-text summary for public course pages (about two or three sentences). */
export function courseShortSummary(
  description: string | null | undefined,
  maxChars = 320,
  title?: string,
): string {
  const plain = plainTextFromHtml(description || "");
  if (!plain) {
    return "A CAISBE certificate program for built-environment professionals.";
  }

  const sentences = (plain.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [plain]).filter(
    (sentence, index) =>
      !(index === 0 && title && sameWords(sentence, title)),
  );
  let out = "";
  for (const raw of sentences.slice(0, 3)) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const next = out ? `${out} ${sentence}` : sentence;
    if (out && next.length > maxChars) break;
    out = next;
    if (out.length >= maxChars) break;
  }

  if (!out) {
    return "A CAISBE certificate program for built-environment professionals.";
  }

  if (out.length > maxChars) {
    const cut = out.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    out = `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }
  return out;
}
