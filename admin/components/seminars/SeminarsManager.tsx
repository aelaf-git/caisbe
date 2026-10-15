"use client";

import { useMemo, useRef, useState } from "react";
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
import { apiFetch, ApiError, type Seminar } from "@/lib/auth";
import { IconActionButton } from "@/components/ui/IconAction";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function emptyForm(itemCount: number) {
  return {
    title: "",
    description: "",
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
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");

  const isEditing = editingId !== null;
  const formValues = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim(),
      published,
      sort_order: String(Number(sortOrder) || 0),
    }),
    [title, description, published, sortOrder],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function clearForm() {
    const next = emptyForm(items.length);
    setEditingId(null);
    setTitle(next.title);
    setDescription(next.description);
    setPublished(next.published);
    setSortOrder(next.sort_order);
    resetBaseline({
      title: next.title,
      description: next.description,
      published: next.published,
      sort_order: String(Number(next.sort_order) || 0),
    });
  }

  function startEdit(item: Seminar) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setPublished(item.published);
    setSortOrder(String(item.sort_order));
    resetBaseline({
      title: item.title.trim(),
      description: item.description.trim(),
      published: item.published,
      sort_order: String(item.sort_order || 0),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSave() {
    if (!dirty) return;
    if (!title.trim() || !description.trim()) {
      onError("Title and description are required.");
      return;
    }
    const body = {
      title: title.trim(),
      description: description.trim(),
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
      description: `${item.title} will be removed from the certificate programs page.`,
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
              Published seminars appear at the bottom of the certificate programs page.
            </p>
          </div>
          <FormField label="Title">
            <input className={fieldClassName} value={title} onChange={(event) => setTitle(event.target.value)} />
          </FormField>
          <FormField label="Description">
            <textarea
              className={`${textAreaClassName} min-h-28`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Sort order" hint="Lower numbers appear first.">
              <input
                type="number"
                className={fieldClassName}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </FormField>
            <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-caisbe-text">
              <input
                type="checkbox"
                className="h-4 w-4 accent-caisbe-red"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
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
        english={{ title: title, description: description }}
        fields={[
              { name: "title", label: "Title" },
              { name: "description", label: "Description", kind: "textarea", rows: 5 },
        ]}
      />
      </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-caisbe-text-dark">Current seminars</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No seminars yet"
              description="Add a seminar to show it under certificate programs."
            />
          ) : (
            <ul className="mt-4 divide-y divide-ifma-border">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-caisbe-text-dark">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-caisbe-text">{item.description}</p>
                    <div className="mt-2">
                      <Badge tone={item.published ? "success" : "neutral"}>
                        {item.published ? "Published" : "Hidden"}
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
