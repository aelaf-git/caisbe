import type { Chapter, ContentBlock } from "@/lib/lms";

export function isAdminUpload(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0];
  if (path.includes("/api/uploads/")) return true;
  // Object-storage keys: .../uploads/<optional folders>/<32-hex>.<ext>
  return /\/uploads\/(?:[\w.-]+\/)*[a-f0-9]{32}\.[a-z0-9]+$/i.test(path);
}

export function isLegacyChapterReading(block: ContentBlock): boolean {
  return (block.title ?? "").trim().toLowerCase() === "chapter reading" && isAdminUpload(block.url);
}

function isReadingSource(url: string | null | undefined): boolean {
  if (!url) return false;
  if (isAdminUpload(url)) return true;
  return /^https?:\/\//i.test(url.trim());
}

export function readingsForChapter(chapter: Chapter): ContentBlock[] {
  return (chapter.blocks ?? [])
    .filter((block) => block.block_type === "reading" && isReadingSource(block.url))
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}
