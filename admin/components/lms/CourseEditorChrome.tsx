import Badge from "@/components/ui/Badge";
import type { AutosaveStatus } from "@/hooks/autosaveContext";

export function CourseStatusBadge({ status }: { status: string }) {
  const published = status === "published";
  return (
    <Badge tone={published ? "success" : "neutral"}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${published ? "bg-admin-success" : "bg-caisbe-muted"}`} />
      {published ? "Published" : "Draft"}
    </Badge>
  );
}

export function SaveStatus({
  status,
  label,
}: {
  status: AutosaveStatus;
  label: string | null;
}) {
  if (!label) return null;

  return (
    <span
      role={status === "error" ? "alert" : "status"}
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        status === "error" ? "text-caisbe-red" : "text-caisbe-muted"
      }`}
    >
      {status === "saving" || status === "pending" ? (
        <span className="h-2 w-2 animate-pulse rounded-full bg-admin-warning" />
      ) : status === "error" ? (
        <span className="h-2 w-2 rounded-full bg-caisbe-red" />
      ) : (
        <svg className="h-3.5 w-3.5 text-admin-success" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
        </svg>
      )}
      {label}
    </span>
  );
}
