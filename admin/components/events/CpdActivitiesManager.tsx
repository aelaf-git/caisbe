"use client";

import { useRef, useState } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName } from "@/components/ui/FormField";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, ApiError, type CpdActivity } from "@/lib/auth";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

export default function CpdActivitiesManager({
  activities,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  activities: CpdActivity[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState("");
  const [category, setCategory] = useState("course");
  const [hoursReported, setHoursReported] = useState("0");
  const [hoursApproved, setHoursApproved] = useState("0");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");

  const isEditing = editingId !== null;

  function clearForm() {
    setEditingId(null);
    setActivity("");
    setCategory("course");
    setHoursReported("0");
    setHoursApproved("0");
    setPublished(true);
    setSortOrder("0");
  }

  function startEdit(row: CpdActivity) {
    setEditingId(row.id);
    setActivity(row.activity);
    setCategory(row.category);
    setHoursReported(String(row.hours_reported));
    setHoursApproved(String(row.hours_approved));
    setPublished(row.published);
    setSortOrder(String(row.sort_order));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save() {
    if (!activity.trim()) {
      onError("CPD activity name is required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        activity: activity.trim(),
        category: category.trim() || "course",
        hours_reported: Number(hoursReported) || 0,
        hours_approved: Number(hoursApproved) || 0,
        published,
        sort_order: Number(sortOrder) || 0,
      };
      if (isEditing) {
        await apiFetch(`/admin/cpd-activities/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onSuccess("CPD activity updated.");
      } else {
        await apiFetch("/admin/cpd-activities", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onSuccess("CPD activity created.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save CPD activity.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row: CpdActivity) {
    const ok = await askConfirm({
      title: "Delete CPD activity?",
      description: `Remove “${row.activity}” from the Professional Development table.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/cpd-activities/${row.id}`, { method: "DELETE" });
      onSuccess("CPD activity deleted.");
      if (editingId === row.id) clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete CPD activity.");
    }
  }

  return (
    <div className="space-y-6">
      <div ref={formRef}>
        <Card className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
              {isEditing ? "Edit CPD activity" : "Add CPD activity"}
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Courses, seminars, and events shown in the CPD Activity table on
              Professional Development.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="CPD activity">
                <input
                  id="cpd-activity"
                  className={fieldClassName}
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Category">
              <select
                id="cpd-category"
                className={fieldClassName}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="course">Course</option>
                <option value="seminar">Seminar</option>
                <option value="event">Event</option>
                <option value="workshop">Workshop</option>
              </select>
            </FormField>
            <FormField label="Sort order">
              <input
                id="cpd-sort"
                type="number"
                className={fieldClassName}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </FormField>
            <FormField label="CPD hours reported">
              <input
                id="cpd-reported"
                type="number"
                min={0}
                step={0.5}
                className={fieldClassName}
                value={hoursReported}
                onChange={(e) => setHoursReported(e.target.value)}
              />
            </FormField>
            <FormField label="CPD hours approved">
              <input
                id="cpd-approved"
                type="number"
                min={0}
                step={0.5}
                className={fieldClassName}
                value={hoursApproved}
                onChange={(e) => setHoursApproved(e.target.value)}
              />
            </FormField>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published on website
          </label>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : isEditing ? "Update activity" : "Create activity"}
            </Button>
            {isEditing ? (
              <Button variant="secondary" onClick={clearForm} disabled={saving}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-ifma-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            CPD activities
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            title="No CPD activities"
            description="Add courses and seminars with reported and approved CPD hours."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-admin-surface-muted text-xs uppercase tracking-wide text-caisbe-muted">
                <tr>
                  <th className="px-6 py-3 font-semibold">CPD activity</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Hours reported</th>
                  <th className="px-4 py-3 font-semibold">Hours approved</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ifma-border">
                {activities.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-3 font-medium text-caisbe-text-dark">
                      {row.activity}
                    </td>
                    <td className="px-4 py-3 capitalize text-caisbe-muted">
                      {row.category}
                    </td>
                    <td className="px-4 py-3 text-caisbe-text">{row.hours_reported}</td>
                    <td className="px-4 py-3 text-caisbe-text">{row.hours_approved}</td>
                    <td className="px-4 py-3">
                      <Badge tone={row.published ? "success" : "neutral"}>
                        {row.published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <EditIconButton
                          label={`Edit ${row.activity}`}
                          onClick={() => startEdit(row)}
                        />
                        <DeleteIconButton
                          label={`Delete ${row.activity}`}
                          onClick={() => void deleteRow(row)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
