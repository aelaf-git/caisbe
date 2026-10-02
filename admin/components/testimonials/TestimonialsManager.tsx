"use client";

import { useMemo, useRef, useState } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import SaveButton from "@/components/ui/SaveButton";
import Skeleton from "@/components/ui/Skeleton";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, ApiError, type Testimonial } from "@/lib/auth";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function emptyForm(itemCount: number) {
  return {
    quote: "",
    name: "",
    role: "",
    published: true,
    sort_order: String(itemCount),
  };
}

export default function TestimonialsManager({
  items,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  items: Testimonial[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");

  const isEditing = editingId !== null;
  const formValues = useMemo(
    () => ({
      quote: quote.trim(),
      name: name.trim(),
      role: role.trim(),
      published,
      sort_order: String(Number(sortOrder) || 0),
    }),
    [quote, name, role, published, sortOrder],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function clearForm() {
    const next = emptyForm(items.length);
    setEditingId(null);
    setQuote(next.quote);
    setName(next.name);
    setRole(next.role);
    setPublished(next.published);
    setSortOrder(next.sort_order);
    resetBaseline({
      quote: next.quote,
      name: next.name,
      role: next.role,
      published: next.published,
      sort_order: String(Number(next.sort_order) || 0),
    });
  }

  function startEdit(item: Testimonial) {
    setEditingId(item.id);
    setQuote(item.quote);
    setName(item.name);
    setRole(item.role);
    setPublished(item.published);
    setSortOrder(String(item.sort_order));
    resetBaseline({
      quote: item.quote.trim(),
      name: item.name.trim(),
      role: item.role.trim(),
      published: item.published,
      sort_order: String(item.sort_order || 0),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSave() {
    if (!dirty) return;
    if (!quote.trim() || !name.trim() || !role.trim()) {
      onError("Quote, name, and role are required.");
      return;
    }
    const body = {
      quote: quote.trim(),
      name: name.trim(),
      role: role.trim(),
      published,
      sort_order: Number(sortOrder) || 0,
    };
    setSaving(true);
    try {
      if (isEditing) {
        await apiFetch(`/admin/testimonials/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onSuccess("Testimonial updated.");
      } else {
        await apiFetch("/admin/testimonials", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onSuccess("Testimonial added.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save testimonial.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item: Testimonial) {
    try {
      await apiFetch(`/admin/testimonials/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !item.published }),
      });
      onSuccess(item.published ? "Testimonial hidden." : "Testimonial published.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update testimonial.");
    }
  }

  async function deleteItem(item: Testimonial) {
    const ok = await askConfirm({
      title: "Delete testimonial?",
      description: `The quote from ${item.name} will be removed from the homepage.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/testimonials/${item.id}`, { method: "DELETE" });
      if (editingId === item.id) clearForm();
      onSuccess("Testimonial deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete testimonial.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div ref={formRef} className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-caisbe-text-dark">
              {isEditing ? "Edit testimonial" : "Add testimonial"}
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Published quotes appear in the homepage testimonials section.
            </p>
          </div>
          <FormField label="Quote">
            <textarea
              className={`${textAreaClassName} min-h-28`}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name">
              <input className={fieldClassName} value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Role">
              <input className={fieldClassName} value={role} onChange={(e) => setRole(e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Sort order">
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
              idleLabel={isEditing ? "Save changes" : "Add testimonial"}
              onClick={() => void handleSave()}
            />
            {isEditing ? (
              <Button type="button" variant="secondary" onClick={clearForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-caisbe-text-dark">Current testimonials</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="No testimonials yet" description="Add a quote to show it on the homepage." />
          ) : (
            <ul className="mt-4 divide-y divide-ifma-border">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-caisbe-text">&ldquo;{item.quote}&rdquo;</p>
                    <p className="mt-2 text-sm font-semibold text-caisbe-text-dark">
                      {item.name}
                      <span className="font-normal text-caisbe-muted"> · {item.role}</span>
                    </p>
                    <div className="mt-2">
                      <Badge tone={item.published ? "success" : "neutral"}>
                        {item.published ? "Published" : "Hidden"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onClick={() => void togglePublished(item)}>
                      {item.published ? "Hide" : "Publish"}
                    </Button>
                    <EditIconButton label={`Edit ${item.name}`} onClick={() => startEdit(item)} />
                    <DeleteIconButton label={`Delete ${item.name}`} onClick={() => void deleteItem(item)} />
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
