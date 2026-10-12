"use client";

import { useMemo, useRef, useState } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import SaveButton from "@/components/ui/SaveButton";
import Skeleton from "@/components/ui/Skeleton";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, ApiError, type MediaAsset } from "@/lib/auth";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function extractYouTubeId(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0] ?? "";
      return /^[\w-]{6,32}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const v = parsed.searchParams.get("v");
      if (v && /^[\w-]{6,32}$/.test(v)) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] && ["embed", "shorts", "live"].includes(parts[0]) && parts[1]) {
        return /^[\w-]{6,32}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function thumbnailFor(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export default function YouTubeManager({
  assets,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  assets: MediaAsset[];
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
  const [externalUrl, setExternalUrl] = useState("");
  const [featured, setFeatured] = useState(false);

  const isEditing = editingId !== null;
  const preview = thumbnailFor(externalUrl);

  const formValues = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim(),
      external_url: externalUrl.trim(),
      featured,
    }),
    [title, description, externalUrl, featured],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setExternalUrl("");
    setFeatured(false);
    resetBaseline({ title: "", description: "", external_url: "", featured: false });
  }

  function startEdit(asset: MediaAsset) {
    setEditingId(asset.id);
    setTitle(asset.title);
    setDescription(asset.description ?? "");
    setExternalUrl(asset.external_url ?? "");
    setFeatured(asset.featured);
    resetBaseline({
      title: asset.title.trim(),
      description: (asset.description ?? "").trim(),
      external_url: (asset.external_url ?? "").trim(),
      featured: asset.featured,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    if (!dirty) return;
    if (!title.trim()) {
      onError("Title is required.");
      return;
    }
    if (!extractYouTubeId(externalUrl)) {
      onError("Enter a valid YouTube URL.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        external_url: externalUrl.trim(),
        category: "youtube",
        featured,
        published: true,
      };
      if (isEditing && editingId !== null) {
        await apiFetch(`/admin/media/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        onSuccess("YouTube video updated.");
      } else {
        await apiFetch("/admin/media", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onSuccess("YouTube video published.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save YouTube video.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleField(asset: MediaAsset, field: "published" | "featured") {
    try {
      await apiFetch(`/admin/media/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: !asset[field] }),
      });
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update video.");
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    const ok = await askConfirm({
      title: "Delete YouTube video?",
      description: `Remove “${asset.title}” from the media library?`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/media/${asset.id}`, { method: "DELETE" });
      if (editingId === asset.id) clearForm();
      onSuccess("YouTube video deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete video.");
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <div ref={formRef}>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            {isEditing ? "Edit YouTube video" : "Add YouTube video"}
          </h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Paste a YouTube link. The thumbnail is pulled automatically and shown on the website.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <FormField label="Title">
            <input
              className={fieldClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              placeholder="Video title"
            />
          </FormField>
          <FormField label="YouTube URL" hint="Watch, share, or youtu.be links work.">
            <input
              className={fieldClassName}
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              disabled={saving}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </FormField>
          <div className="lg:col-span-2">
            <FormField label="Description">
              <textarea
                className={textAreaClassName}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-caisbe-text">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              disabled={saving}
            />
            Featured
          </label>
          <div className="lg:col-span-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="aspect-video max-w-md rounded-[16px] object-cover shadow-hopewell"
              />
            ) : (
              <div className="flex aspect-video max-w-md items-center justify-center rounded-[16px] border border-dashed border-ifma-border bg-admin-surface-muted/40 text-sm text-caisbe-muted">
                Thumbnail preview
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <SaveButton
            dirty={dirty}
            saving={saving}
            idleLabel={isEditing ? "Save changes" : "Publish video"}
            onClick={() => void submit()}
          />
          {isEditing ? (
            <button
              type="button"
              onClick={clearForm}
              className="rounded-md border-2 border-ifma-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Published videos</h2>
        {loading ? (
          <Skeleton className="mt-4 h-24" />
        ) : assets.length === 0 ? (
          <EmptyState title="No YouTube videos yet" description="Add a YouTube link above to get started." />
        ) : (
          <ul className="mt-4 divide-y divide-ifma-border-light">
            {assets.map((asset) => (
              <li key={asset.id} className="flex flex-wrap items-center gap-4 py-4">
                {asset.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.cover_url} alt="" className="h-16 w-28 rounded-md object-cover" />
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center rounded-md bg-admin-surface-muted text-[10px] font-bold uppercase text-caisbe-muted">
                    YouTube
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-caisbe-text-dark">{asset.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge tone={asset.published ? "success" : "neutral"}>
                      {asset.published ? "Published" : "Draft"}
                    </Badge>
                    {asset.featured ? <Badge tone="brand">Featured</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleField(asset, "published")}
                    className="text-xs font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
                  >
                    {asset.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleField(asset, "featured")}
                    className="text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:underline"
                  >
                    {asset.featured ? "Unfeature" : "Feature"}
                  </button>
                  <EditIconButton label="Edit video" onClick={() => startEdit(asset)} />
                  <DeleteIconButton label="Delete video" onClick={() => void deleteAsset(asset)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
