"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FrenchTranslationPanel from "@/components/translations/FrenchTranslationPanel";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import SaveButton from "@/components/ui/SaveButton";
import Skeleton from "@/components/ui/Skeleton";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, ApiError, type Seminar, type SeminarRegistration } from "@/lib/auth";
import { IconActionButton } from "@/components/ui/IconAction";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function dollarsToCents(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function centsToDollars(cents: number) {
  return String((cents || 0) / 100);
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function emptyForm(itemCount: number) {
  return {
    title: "",
    description: "",
    event_date_label: "Thursday, November 12, 2026",
    event_time_label:
      "9:00 AM – 4:00 PM Eastern Time (ET) / 8:00 AM – 3:00 PM Central Time (CT) / 6:00 AM – 1:00 PM Pacific Time (PT)",
    event_format_label:
      "Hybrid – In-person in Chicago, IL, with a live virtual option for remote attendees",
    event_starts_at: "",
    registration_enabled: true,
    member_price: "50",
    non_member_price: "75",
    student_price: "40",
    published: true,
    sort_order: String(itemCount),
  };
}

export default function SeminarsManager({
  items,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  items: Seminar[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDateLabel, setEventDateLabel] = useState("");
  const [eventTimeLabel, setEventTimeLabel] = useState("");
  const [eventFormatLabel, setEventFormatLabel] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [memberPrice, setMemberPrice] = useState("50");
  const [nonMemberPrice, setNonMemberPrice] = useState("75");
  const [studentPrice, setStudentPrice] = useState("40");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [registrations, setRegistrations] = useState<SeminarRegistration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  const isEditing = editingId !== null;
  const formValues = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim(),
      event_date_label: eventDateLabel.trim(),
      event_time_label: eventTimeLabel.trim(),
      event_format_label: eventFormatLabel.trim(),
      event_starts_at: eventStartsAt,
      registration_enabled: registrationEnabled,
      member_price: memberPrice.trim(),
      non_member_price: nonMemberPrice.trim(),
      student_price: studentPrice.trim(),
      published,
      sort_order: String(Number(sortOrder) || 0),
    }),
    [
      title,
      description,
      eventDateLabel,
      eventTimeLabel,
      eventFormatLabel,
      eventStartsAt,
      registrationEnabled,
      memberPrice,
      nonMemberPrice,
      studentPrice,
      published,
      sortOrder,
    ],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function applyForm(next: ReturnType<typeof emptyForm>) {
    setTitle(next.title);
    setDescription(next.description);
    setEventDateLabel(next.event_date_label);
    setEventTimeLabel(next.event_time_label);
    setEventFormatLabel(next.event_format_label);
    setEventStartsAt(next.event_starts_at);
    setRegistrationEnabled(next.registration_enabled);
    setMemberPrice(next.member_price);
    setNonMemberPrice(next.non_member_price);
    setStudentPrice(next.student_price);
    setPublished(next.published);
    setSortOrder(next.sort_order);
    resetBaseline({
      title: next.title,
      description: next.description,
      event_date_label: next.event_date_label,
      event_time_label: next.event_time_label,
      event_format_label: next.event_format_label,
      event_starts_at: next.event_starts_at,
      registration_enabled: next.registration_enabled,
      member_price: next.member_price,
      non_member_price: next.non_member_price,
      student_price: next.student_price,
      published: next.published,
      sort_order: String(Number(next.sort_order) || 0),
    });
  }

  function clearForm() {
    setEditingId(null);
    setRegistrations([]);
    applyForm(emptyForm(items.length));
  }

  function startEdit(item: Seminar) {
    setEditingId(item.id);
    applyForm({
      title: item.title,
      description: item.description,
      event_date_label: item.event_date_label || "",
      event_time_label: item.event_time_label || "",
      event_format_label: item.event_format_label || "",
      event_starts_at: toDatetimeLocalValue(item.event_starts_at),
      registration_enabled: item.registration_enabled ?? true,
      member_price: centsToDollars(item.member_price_cents ?? 5000),
      non_member_price: centsToDollars(item.non_member_price_cents ?? 7500),
      student_price: centsToDollars(item.student_price_cents ?? 4000),
      published: item.published,
      sort_order: String(item.sort_order),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (!editingId) {
      setRegistrations([]);
      return;
    }
    let cancelled = false;
    async function loadRegs() {
      setRegsLoading(true);
      try {
        const rows = await apiFetch<SeminarRegistration[]>(
          `/admin/seminars/${editingId}/registrations`,
        );
        if (!cancelled) setRegistrations(rows);
      } catch {
        if (!cancelled) setRegistrations([]);
      } finally {
        if (!cancelled) setRegsLoading(false);
      }
    }
    void loadRegs();
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  async function handleSave() {
    if (!dirty) return;
    if (!title.trim() || !description.trim()) {
      onError("Title and description are required.");
      return;
    }
    const body = {
      title: title.trim(),
      description: description.trim(),
      event_date_label: eventDateLabel.trim() || null,
      event_time_label: eventTimeLabel.trim() || null,
      event_format_label: eventFormatLabel.trim() || null,
      event_starts_at: fromDatetimeLocalValue(eventStartsAt),
      registration_enabled: registrationEnabled,
      member_price_cents: dollarsToCents(memberPrice),
      non_member_price_cents: dollarsToCents(nonMemberPrice),
      student_price_cents: dollarsToCents(studentPrice),
      published,
      sort_order: Number(sortOrder) || 0,
    };
    setSaving(true);
    try {
      if (isEditing) {
        await apiFetch(`/admin/seminars/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onSuccess("Seminar updated.");
      } else {
        await apiFetch("/admin/seminars", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onSuccess("Seminar added.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save seminar.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item: Seminar) {
    try {
      await apiFetch(`/admin/seminars/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !item.published }),
      });
      onSuccess(item.published ? "Seminar hidden." : "Seminar published.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update seminar.");
    }
  }

  async function deleteItem(item: Seminar) {
    const ok = await askConfirm({
      title: "Remove seminar?",
      description: `${item.title} will be removed from the homepage upcoming strip and Professional development.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/seminars/${item.id}`, { method: "DELETE" });
      if (editingId === item.id) clearForm();
      onSuccess("Seminar removed.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to remove seminar.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div ref={formRef} className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-caisbe-text-dark">
              {isEditing ? "Edit seminar" : "Add seminar"}
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Manage seminar events, pricing, and registration here. Published seminars appear on the homepage
              upcoming strip and under Professional development. Homepage strip heading and paragraphs are edited
              in Homepage upcoming strip above.
            </p>
          </div>
          <FormField label="Title">
            <input className={fieldClassName} value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Description">
            <textarea
              className={`${textAreaClassName} min-h-28`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
          <FormField label="Event date label">
            <input
              className={fieldClassName}
              value={eventDateLabel}
              onChange={(e) => setEventDateLabel(e.target.value)}
              placeholder="Thursday, November 12, 2026"
            />
          </FormField>
          <FormField label="Event time label">
            <textarea
              className={`${textAreaClassName} min-h-20`}
              value={eventTimeLabel}
              onChange={(e) => setEventTimeLabel(e.target.value)}
            />
          </FormField>
          <FormField label="Format / location label">
            <textarea
              className={`${textAreaClassName} min-h-20`}
              value={eventFormatLabel}
              onChange={(e) => setEventFormatLabel(e.target.value)}
            />
          </FormField>
          <FormField
            label="Event starts"
            hint="Homepage upcoming strip uses this time. Leave blank to keep the seminar eligible until you unpublish it."
          >
            <input
              type="datetime-local"
              className={fieldClassName}
              value={eventStartsAt}
              onChange={(e) => setEventStartsAt(e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Member price (USD)">
              <input
                type="number"
                min="0"
                step="1"
                className={fieldClassName}
                value={memberPrice}
                onChange={(e) => setMemberPrice(e.target.value)}
              />
            </FormField>
            <FormField label="Non-member price (USD)">
              <input
                type="number"
                min="0"
                step="1"
                className={fieldClassName}
                value={nonMemberPrice}
                onChange={(e) => setNonMemberPrice(e.target.value)}
              />
            </FormField>
            <FormField label="Student price (USD)">
              <input
                type="number"
                min="0"
                step="1"
                className={fieldClassName}
                value={studentPrice}
                onChange={(e) => setStudentPrice(e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Sort order" hint="Lower numbers appear first.">
              <input
                type="number"
                className={fieldClassName}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </FormField>
            <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-caisbe-text">
              <input
                type="checkbox"
                className="h-4 w-4 accent-caisbe-red"
                checked={registrationEnabled}
                onChange={(e) => setRegistrationEnabled(e.target.checked)}
              />
              Registration open
            </label>
            <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-caisbe-text">
              <input
                type="checkbox"
                className="h-4 w-4 accent-caisbe-red"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Published
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <SaveButton
              dirty={dirty}
              saving={saving}
              idleLabel={isEditing ? "Save changes" : "Add seminar"}
              onClick={() => void handleSave()}
            />
            {isEditing ? (
              <Button type="button" variant="secondary" onClick={clearForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-6">
          <FrenchTranslationPanel
            entityType="seminar"
            entityId={editingId}
            english={{
              title,
              description,
              event_date_label: eventDateLabel,
              event_time_label: eventTimeLabel,
              event_format_label: eventFormatLabel,
            }}
            fields={[
              { name: "title", label: "Title" },
              { name: "description", label: "Description", kind: "textarea", rows: 5 },
              { name: "event_date_label", label: "Event date" },
              { name: "event_time_label", label: "Event time", kind: "textarea", rows: 3 },
              { name: "event_format_label", label: "Format", kind: "textarea", rows: 3 },
            ]}
          />
        </div>
      </Card>

      {isEditing ? (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-caisbe-text-dark">Registrations</h2>
            {regsLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-16" />
              </div>
            ) : registrations.length === 0 ? (
              <p className="mt-3 text-sm text-caisbe-muted">No registrations yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-ifma-border">
                {registrations.map((row) => (
                  <li key={row.id} className="py-3 text-sm">
                    <p className="font-semibold text-caisbe-text-dark">
                      {row.first_name} {row.last_name} · {row.email}
                    </p>
                    <p className="mt-1 text-caisbe-muted">
                      {row.membership_status.replaceAll("_", " ")} · {row.attendance.replaceAll("_", " ")} ·{" "}
                      ${(row.amount_cents / 100).toFixed(0)} · {row.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-caisbe-text-dark">Current seminars</h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Card content for the homepage and Professional development. Strip title and paragraphs are edited in
            Homepage upcoming strip above.
          </p>
          {loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No seminars yet"
              description="Add a seminar to show it on the homepage upcoming strip and under Professional development."
            />
          ) : (
            <ul className="mt-4 divide-y divide-ifma-border">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-caisbe-text-dark">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-caisbe-text">{item.description}</p>
                    {item.event_date_label ? (
                      <p className="mt-1 text-xs text-caisbe-muted">{item.event_date_label}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={item.published ? "success" : "neutral"}>
                        {item.published ? "Published" : "Hidden"}
                      </Badge>
                      <Badge tone={item.registration_enabled ? "success" : "neutral"}>
                        {item.registration_enabled ? "Registration open" : "Registration closed"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconActionButton
                      icon={item.published ? "unpublish" : "publish"}
                      label={item.published ? `Hide ${item.title}` : `Publish ${item.title}`}
                      onClick={() => void togglePublished(item)}
                    />
                    <EditIconButton label={`Edit ${item.title}`} onClick={() => startEdit(item)} />
                    <DeleteIconButton label={`Remove ${item.title}`} onClick={() => void deleteItem(item)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
