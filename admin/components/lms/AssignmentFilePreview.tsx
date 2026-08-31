"use client";

import type { ContentBlock } from "@/lib/lms";

function fileKind(url: string, title?: string | null): "pdf" | "word" | "unknown" {
  const name = (title || url).toLowerCase().split("?")[0];
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "word";
  return "unknown";
}

export function isAssignmentFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) return true;
  return (
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(docx?)$/.test(name)
  );
}

export const ASSIGNMENT_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function AssignmentFilePreview({ block }: { block: ContentBlock }) {
  if (!block.url) {
    return <p className="text-xs text-caisbe-muted">No file attached.</p>;
  }

  const kind = fileKind(block.url, block.title || block.label);
  const label = block.label || block.title || "Assignment file";

  if (kind === "pdf") {
    return (
      <div>
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-caisbe-green hover:underline"
        >
          Open PDF — {label}
        </a>
        <iframe
          title={label}
          src={block.url}
          className="mt-2 h-56 w-full border border-ifma-border"
        />
      </div>
    );
  }

  return (
    <a
      href={block.url}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-semibold text-caisbe-green hover:underline"
    >
      {kind === "word" ? "Download Word document" : "Download file"} — {label}
    </a>
  );
}
