"use client";

import SectionActions, { type SectionActionsProps } from "@/components/lms/SectionActions";

export type EditorActionBarSection = SectionActionsProps & { id: string };

function needsAttention(section: SectionActionsProps): boolean {
  const unsaved =
    section.autosaveStatus === "pending" ||
    section.autosaveStatus === "saving" ||
    section.autosaveStatus === "error";
  return unsaved || (section.live && section.hasStagedChanges);
}

/**
 * Sticky bottom bar that repeats each section's Save / Publish controls while
 * that section has unsaved or unpublished work, so long pages never need a
 * scroll to the header to save.
 */
export default function EditorActionBar({ sections }: { sections: EditorActionBarSection[] }) {
  const visible = sections.filter(needsAttention);
  if (visible.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Pending course changes"
      className="sticky bottom-0 z-20 -mx-4 border-t border-ifma-border bg-admin-canvas/95 px-4 py-3 shadow-brand-card backdrop-blur md:-mx-8 md:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 divide-y divide-ifma-border/60">
        {visible.map((section) => {
          const { id, ...rest } = section;
          return (
            <div key={id} className="pt-3 first:pt-0">
              <SectionActions {...rest} compact />
            </div>
          );
        })}
      </div>
    </div>
  );
}
