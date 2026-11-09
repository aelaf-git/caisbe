"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SaveStatus } from "@/components/lms/CourseEditorChrome";
import type { AutosaveStatus } from "@/hooks/autosaveContext";

export type SectionActionsProps = {
  /** Section name, e.g. "Course info". Used for accessible labels. */
  label: string;
  /** Students can currently see this section. */
  live: boolean;
  autosaveStatus: AutosaveStatus;
  /** Saved edits that students have not received yet (only meaningful while live). */
  hasStagedChanges: boolean;
  onSave: () => void;
  onPublishChanges: () => void;
  /** Label for the control that makes the section live for the first time. */
  publishLabel: string;
  /** Label for the control that takes the section offline again. */
  unpublishLabel: string;
  onTogglePublish: () => void;
  /** Which action is in flight, if any. */
  busy?: "save" | "publish" | "toggle" | null;
  /** Disables everything (e.g. while another section is working). */
  disabled?: boolean;
  /** When set, the publish control is locked and this text explains why. */
  lockedReason?: string | null;
  /** Tighter layout for the sticky bar. */
  compact?: boolean;
};

export function sectionStateLabel({
  live,
  autosaveStatus,
  hasStagedChanges,
}: Pick<SectionActionsProps, "live" | "autosaveStatus" | "hasStagedChanges">): {
  text: string;
  tone: "neutral" | "success" | "warning" | "info";
} {
  if (autosaveStatus === "error") return { text: "Autosave failed", tone: "warning" };
  if (autosaveStatus === "saving" || autosaveStatus === "pending") {
    return { text: "Saving…", tone: "info" };
  }
  if (live && hasStagedChanges) return { text: "Unpublished edits", tone: "warning" };
  if (live) return { text: "Live", tone: "success" };
  if (autosaveStatus === "saved") return { text: "Draft saved", tone: "neutral" };
  return { text: "Draft", tone: "neutral" };
}

export default function SectionActions({
  label,
  live,
  autosaveStatus,
  hasStagedChanges,
  onSave,
  onPublishChanges,
  publishLabel,
  unpublishLabel,
  onTogglePublish,
  busy = null,
  disabled = false,
  lockedReason = null,
  compact = false,
}: SectionActionsProps) {
  const unsaved = autosaveStatus === "pending" || autosaveStatus === "saving" || autosaveStatus === "error";
  const showPublishChanges = live && hasStagedChanges && !unsaved;
  const anyBusy = busy !== null || disabled;
  const state = sectionStateLabel({ live, autosaveStatus, hasStagedChanges });
  const size = compact ? "sm" : "md";

  const statusLine = (() => {
    if (autosaveStatus === "error") return "Autosave failed. Fix the field or try again.";
    if (autosaveStatus === "saving" || autosaveStatus === "pending") return "Saving draft…";
    if (live && hasStagedChanges) return "Saved. Students still see the previous version.";
    if (live) return "Students see the latest version.";
    if (autosaveStatus === "saved") return "Draft saved.";
    return null;
  })();

  return (
    <div
      className={`flex flex-col gap-2 ${compact ? "sm:flex-row sm:items-center sm:justify-between" : "sm:items-end"}`}
      aria-label={`${label} actions`}
    >
      <div className={`flex items-center gap-2 ${compact ? "" : "sm:justify-end"}`}>
        {compact ? <span className="text-sm font-semibold text-caisbe-text-dark">{label}</span> : null}
        <Badge tone={state.tone}>{state.text}</Badge>
        {!compact ? <SaveStatus status={autosaveStatus} label={statusLine} /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showPublishChanges ? (
          <Button
            size={size}
            variant="primary"
            disabled={anyBusy}
            onClick={onPublishChanges}
            aria-label={`Publish ${label.toLowerCase()} changes`}
          >
            {busy === "publish" ? "Publishing…" : "Publish changes"}
          </Button>
        ) : (
          <Button
            size={size}
            variant={live ? "secondary" : "primary"}
            disabled={anyBusy || !unsaved}
            onClick={onSave}
            aria-label={`Save ${label.toLowerCase()}`}
          >
            {busy === "save" ? "Saving…" : autosaveStatus === "saved" && !unsaved ? "Saved" : "Save"}
          </Button>
        )}
        <Button
          size={size}
          variant={live ? "ghost" : "secondary"}
          disabled={anyBusy || Boolean(lockedReason)}
          onClick={onTogglePublish}
          title={lockedReason ?? undefined}
        >
          {busy === "toggle" ? "Working…" : live ? unpublishLabel : publishLabel}
        </Button>
      </div>
      {lockedReason && !compact ? (
        <p className="text-xs text-caisbe-muted sm:text-right">{lockedReason}</p>
      ) : null}
    </div>
  );
}
