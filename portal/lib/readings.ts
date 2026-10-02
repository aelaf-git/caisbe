import type { Chapter, ContentBlock } from "@/lib/lms";

export function isAdminUpload(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.split("?")[0].includes("/api/uploads/");
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
