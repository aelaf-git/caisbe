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
import { apiFetch, apiUpload, ApiError, type LeadershipPerson } from "@/lib/auth";
import { IconActionButton } from "@/components/ui/IconAction";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function emptyForm(itemCount: number) {
  return {
    name: "",
    role: "",
    credentials: "",
    bio: "",
    email: "",
    photo_url: "",
    published: true,
    sort_order: String(itemCount),
  };
}

export default function LeadershipManager({
  items,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  items: LeadershipPerson[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [credentials, setCredentials] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");

  const isEditing = editingId !== null;
  const formValues = useMemo(
    () => ({
      name: name.trim(),
      role: role.trim(),
      credentials: credentials.trim(),
      bio: bio.trim(),
      email: email.trim(),
      photo_url: photoUrl.trim(),
      published,
      sort_order: String(Number(sortOrder) || 0),
    }),
    [name, role, credentials, bio, email, photoUrl, published, sortOrder],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function clearForm() {
    const next = emptyForm(items.length);
    setEditingId(null);
    setName(next.name);
    setRole(next.role);
    setCredentials(next.credentials);
    setBio(next.bio);
    setEmail(next.email);
    setPhotoUrl(next.photo_url);
    setPublished(next.published);
    setSortOrder(next.sort_order);
    resetBaseline({
      name: next.name,
      role: next.role,
      credentials: next.credentials,
      bio: next.bio,
      email: next.email,
      photo_url: next.photo_url,
      published: next.published,
      sort_order: String(Number(next.sort_order) || 0),
    });
  }

  function startEdit(item: LeadershipPerson) {
    setEditingId(item.id);
    setName(item.name);
    setRole(item.role);
    setCredentials(item.credentials ?? "");
    setBio(item.bio ?? "");
    setEmail(item.email ?? "");
    setPhotoUrl(item.photo_url ?? "");
    setPublished(item.published);
    setSortOrder(String(item.sort_order));
    resetBaseline({
      name: item.name.trim(),
      role: item.role.trim(),
      credentials: (item.credentials ?? "").trim(),
      bio: (item.bio ?? "").trim(),
      email: (item.email ?? "").trim(),
      photo_url: (item.photo_url ?? "").trim(),
      published: item.published,
      sort_order: String(item.sort_order || 0),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, { folder: "leadership" });
      setPhotoUrl(uploaded.url);
      onSuccess("Photo uploaded.");
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!dirty) return;
    if (!name.trim() || !role.trim()) {
      onError("Name and role are required.");
      return;
    }
    const body = {
      name: name.trim(),
      role: role.trim(),
      credentials: credentials.trim() || null,
      bio: bio.trim() || null,
      email: email.trim() || null,
      photo_url: photoUrl.trim() || null,
      published,
      sort_order: Number(sortOrder) || 0,
    };
    setSaving(true);
    try {
      if (isEditing) {
        await apiFetch(`/admin/leadership/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onSuccess("Leadership person updated.");
      } else {
        await apiFetch("/admin/leadership", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onSuccess("Leadership person added.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save leadership person.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item: LeadershipPerson) {
    try {
      await apiFetch(`/admin/leadership/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !item.published }),
      });
      onSuccess(item.published ? "Person hidden." : "Person published.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update person.");
    }
  }

  async function deleteItem(item: LeadershipPerson) {
    const ok = await askConfirm({
      title: "Delete leadership person?",
      description: `${item.name} will be removed from the About page.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/leadership/${item.id}`, { method: "DELETE" });
      if (editingId === item.id) clearForm();
      onSuccess("Leadership person deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete person.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div ref={formRef} className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-caisbe-text-dark">
              {isEditing ? "Edit leadership person" : "Add leadership person"}
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Published people appear in the About page leadership section.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name">
              <input className={fieldClassName} value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Role / position">
              <input className={fieldClassName} value={role} onChange={(e) => setRole(e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Credentials">
              <input
                className={fieldClassName}
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder="MBA, FMP"
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                className={fieldClassName}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Bio">
            <textarea
              className={`${textAreaClassName} min-h-24`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short biography shown on the About page"
            />
          </FormField>
          <FormField label="Photo URL">
            <div className="flex flex-wrap items-center gap-3">
              <input
                className={`${fieldClassName} min-w-[16rem] flex-1`}
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="/uploads/leadership/…"
              />
              <label className="inline-flex cursor-pointer items-center">
                <span className="rounded-md border border-ifma-border bg-admin-surface px-3 py-2 text-sm font-semibold text-caisbe-text hover:bg-admin-surface-muted">
                  {uploading ? "Uploading…" : "Upload"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : null}
            </div>
          </FormField>
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
              idleLabel={isEditing ? "Save changes" : "Add person"}
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
            entityType="leadership"
            entityId={editingId}
            english={{ name, role, credentials, bio }}
            fields={[
              { name: "name", label: "Name" },
              { name: "role", label: "Role" },
              { name: "credentials", label: "Credentials" },
              { name: "bio", label: "Bio", kind: "textarea", rows: 3 },
            ]}
          />
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-caisbe-text-dark">Current leadership</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No leadership people yet"
              description="Add a person to show them on the About page."
            />
          ) : (
            <ul className="mt-4 divide-y divide-ifma-border">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="flex min-w-0 flex-1 gap-4">
                    {item.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photo_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-caisbe-red/10 text-sm font-bold text-caisbe-red">
                        {item.name
                          .replace(/\b(Mr|Ms|Mrs|Dr)\.?\s+/gi, "")
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? "")
                          .join("")}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-caisbe-text-dark">{item.name}</p>
                      <p className="mt-1 text-sm text-caisbe-muted">{item.role}</p>
                      {item.credentials ? (
                        <p className="mt-1 text-sm text-caisbe-text">{item.credentials}</p>
                      ) : null}
                      <div className="mt-2">
                        <Badge tone={item.published ? "success" : "neutral"}>
                          {item.published ? "Published" : "Hidden"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconActionButton
                      icon={item.published ? "unpublish" : "publish"}
                      label={item.published ? `Hide ${item.name}` : `Publish ${item.name}`}
                      onClick={() => void togglePublished(item)}
                    />
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
