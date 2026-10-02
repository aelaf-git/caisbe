"use client";

import { useRef, useState, type RefObject } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import ProgressBar from "@/components/ui/ProgressBar";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, apiUpload, ApiError, type IndustryEvent } from "@/lib/auth";

const REPORT_ACCEPT =
  "application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/*,.jpg,.jpeg,.png,.webp";

/** Navbar Events categories — only these types are allowed. */
export const EVENT_TYPE_OPTIONS = [
  { value: "calendar", label: "Event Calendar" },
  {
    value: "expo",
    label: "Africa–Canada Built Environment Expo & Forum",
  },
  { value: "conferences", label: "Conferences and Webinars" },
] as const;

export type EventTypeValue = (typeof EVENT_TYPE_OPTIONS)[number]["value"];

const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

/** Map legacy free-form types onto the three navbar categories. */
function normalizeEventType(raw: string | null | undefined): EventTypeValue {
  const value = (raw || "").trim().toLowerCase();
  if (value === "expo" || value === "forum") return "expo";
  if (
    value === "conferences" ||
    value === "conference" ||
    value === "webinar" ||
    value === "seminar" ||
    value === "summit"
  ) {
    return "conferences";
  }
  return "calendar";
}

function eventTypeLabel(raw: string | null | undefined): string {
  const normalized = normalizeEventType(raw);
  return EVENT_TYPE_LABELS[normalized] ?? "Event Calendar";
}

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;


function resetFileInput(ref: RefObject<HTMLInputElement | null>) {
  if (ref.current) ref.current.value = "";
}

function toInputDate(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fromInputDate(value: string) {
  if (!value) return null;
  return `${value}T12:00:00.000Z`;
}

export default function EventsManager({
  events,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  events: IndustryEvent[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const reportInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("");
  const [eventType, setEventType] = useState("calendar");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [reportFileUrl, setReportFileUrl] = useState<string | null>(null);
  const [cpdHours, setCpdHours] = useState("");
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);

  const isEditing = editingId !== null;

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setSummary("");
    setLocation("");
    setRegion("");
    setEventType("calendar");
    setStartsOn("");
    setEndsOn("");
    setSourceName("");
    setSourceUrl("");
    setReportFileUrl(null);
    setCpdHours("");
    setPublished(true);
    setFeatured(false);
    setUploadProgress(0);
    resetFileInput(reportInputRef);
  }

  function startEdit(event: IndustryEvent) {
    setEditingId(event.id);
    setTitle(event.title);
    setSummary(event.summary ?? "");
    setLocation(event.location ?? "");
    setRegion(event.region ?? "");
    setEventType(normalizeEventType(event.event_type));
    setStartsOn(toInputDate(event.starts_on));
    setEndsOn(toInputDate(event.ends_on));
    setSourceName(event.source_name ?? "");
    setSourceUrl(event.source_url ?? "");
    setReportFileUrl(event.report_file_url);
    setCpdHours(event.cpd_hours != null ? String(event.cpd_hours) : "");
    setPublished(event.published);
    setFeatured(event.featured);
    setUploadProgress(0);
    resetFileInput(reportInputRef);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadReport(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, {
        onProgress: (percent) => setUploadProgress(percent),
      });
      setReportFileUrl(uploaded.url);
      setUploadProgress(100);
      if (!title.trim()) setTitle(uploaded.filename.replace(/\.[^.]+$/, ""));
      onSuccess("Industry report uploaded.");
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!title.trim() || !startsOn) {
      onError("Title and start date are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        summary: summary.trim() || null,
        location: location.trim() || null,
        region: region.trim() || null,
        event_type: normalizeEventType(eventType),
        starts_on: fromInputDate(startsOn),
        ends_on: fromInputDate(endsOn),
        source_name: sourceName.trim() || null,
        source_url: sourceUrl.trim() || null,
        report_file_url: reportFileUrl,
        cpd_hours: cpdHours.trim() ? Number(cpdHours) : null,
        published,
        featured,
      };
      if (isEditing) {
        await apiFetch(`/admin/events/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onSuccess("Event updated.");
      } else {
        await apiFetch("/admin/events", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onSuccess("Event created.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save event.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(event: IndustryEvent) {
    try {
      await apiFetch(`/admin/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !event.published }),
      });
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update event.");
    }
  }

  async function deleteEvent(event: IndustryEvent) {
    const ok = await askConfirm({
      title: "Delete event?",
      description: `Remove “${event.title}” from the calendar.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/events/${event.id}`, { method: "DELETE" });
      onSuccess("Event deleted.");
      if (editingId === event.id) clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete event.");
    }
  }

  return (
    <div className="space-y-6">
      <div ref={formRef}>
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            {isEditing ? "Edit event" : "Add event"}
          </h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Publish facility management conferences, exhibitions, and forums.
            Optionally upload an industry report PDF/DOC used as the source.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Title">
            <input
              id="event-title"
              className={fieldClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField label="Event type">
            <select
              id="event-type"
              className={fieldClassName}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Start date">
            <input
              id="event-start"
              type="date"
              className={fieldClassName}
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </FormField>
          <FormField label="End date">
            <input
              id="event-end"
              type="date"
              className={fieldClassName}
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </FormField>
          <FormField label="Location">
            <input
              id="event-location"
              className={fieldClassName}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormField>
          <FormField label="Region">
            <input
              id="event-region"
              className={fieldClassName}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </FormField>
          <FormField label="Source name">
            <input
              id="event-source-name"
              className={fieldClassName}
              placeholder="IFMA, EventsEye, industry report…"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
            />
          </FormField>
          <FormField label="Source URL">
            <input
              id="event-source-url"
              className={fieldClassName}
              placeholder="https://…"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </FormField>
          <FormField label="CPD hours">
            <input
              id="event-cpd"
              type="number"
              min={0}
              step={0.5}
              className={fieldClassName}
              value={cpdHours}
              onChange={(e) => setCpdHours(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Summary">
          <textarea
            id="event-summary"
            className={textAreaClassName}
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </FormField>

        <div className="space-y-2">
          <p className="text-sm font-medium text-caisbe-text-dark">
            Industry report upload (optional)
          </p>
          <input
            ref={reportInputRef}
            type="file"
            accept={REPORT_ACCEPT}
            disabled={uploading || saving}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadReport(file);
            }}
          />
          {uploading ? <ProgressBar value={uploadProgress} /> : null}
          {reportFileUrl ? (
            <p className="text-xs text-caisbe-muted">
              Attached:{" "}
              <a
                href={reportFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-caisbe-red"
              >
                View file
              </a>{" "}
              ·{" "}
              <button
                type="button"
                className="font-semibold text-caisbe-red"
                onClick={() => setReportFileUrl(null)}
              >
                Remove
              </button>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published on website
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void save()} disabled={saving || uploading}>
            {saving ? "Saving…" : isEditing ? "Update event" : "Create event"}
          </Button>
          {isEditing ? (
            <Button variant="secondary" onClick={clearForm} disabled={saving}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </Card>
      </div>

      <Card className="overflow-hidden" padding="none">
        <div className="border-b border-ifma-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            Calendar events
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Add your first conference, exhibition, or forum listing."
          />
        ) : (
          <ul className="divide-y divide-ifma-border">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-caisbe-text-dark">
                      {event.title}
                    </p>
                    <Badge tone={event.published ? "success" : "neutral"}>
                      {event.published ? "Published" : "Draft"}
                    </Badge>
                    {event.featured ? <Badge tone="brand">Featured</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-caisbe-muted">
                    {toInputDate(event.starts_on)}
                    {event.ends_on ? ` – ${toInputDate(event.ends_on)}` : ""} ·{" "}
                    {eventTypeLabel(event.event_type)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => void togglePublished(event)}
                  >
                    {event.published ? "Unpublish" : "Publish"}
                  </Button>
                  <EditIconButton
                    label={`Edit ${event.title}`}
                    onClick={() => startEdit(event)}
                  />
                  <DeleteIconButton
                    label={`Delete ${event.title}`}
                    onClick={() => void deleteEvent(event)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
