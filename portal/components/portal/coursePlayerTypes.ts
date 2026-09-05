export type NavSelection =
  | { kind: "topic"; topicId: number }
  | { kind: "chapter-block"; blockId: number }
  | { kind: "exam" };

export type PlaylistItem = NavSelection & { chapterId?: number };

export function selectionsEqual(a: NavSelection | null, b: NavSelection): boolean {
  if (!a) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "exam") return true;
  if (a.kind === "topic" && b.kind === "topic") return a.topicId === b.topicId;
  if (a.kind === "chapter-block" && b.kind === "chapter-block") return a.blockId === b.blockId;
  return false;
}
