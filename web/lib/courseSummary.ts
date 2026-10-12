/** Plain-text summary for public course pages (about two or three sentences). */
export function courseShortSummary(
  description: string | null | undefined,
  maxChars = 320,
): string {
  const plain = (description || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) {
    return "A CAISBE certificate program for built-environment professionals.";
  }

  const sentences = plain.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [plain];
  let out = "";
  for (const raw of sentences.slice(0, 3)) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const next = out ? `${out} ${sentence}` : sentence;
    if (out && next.length > maxChars) break;
    out = next;
    if (out.length >= maxChars) break;
  }

  if (out.length > maxChars) {
    const cut = out.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    out = `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }
  return out;
}
