"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import ProgressBar from "@/components/ui/ProgressBar";
import SaveButton from "@/components/ui/SaveButton";
import Skeleton from "@/components/ui/Skeleton";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, apiUpload, ApiError, type MediaAsset } from "@/lib/auth";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function resetFileInput(ref: RefObject<HTMLInputElement | null>) {
  if (ref.current) ref.current.value = "";
}

export default function BlogManager({
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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);

  const isEditing = editingId !== null;

  const formValues = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim(),
      body: body.trim(),
      cover_url: coverUrl,
      featured,
    }),
    [title, description, body, coverUrl, featured],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setBody("");
    setCoverUrl(null);
    setFeatured(false);
    setProgress(0);
    resetFileInput(coverInputRef);
    resetBaseline({
      title: "",
      description: "",
      body: "",
      cover_url: null,
      featured: false,
    });
  }

  function startEdit(asset: MediaAsset) {
    setEditingId(asset.id);
    setTitle(asset.title);
    setDescription(asset.description ?? "");
    setBody(asset.body ?? "");
    setCoverUrl(asset.cover_url);
    setFeatured(asset.featured);
    resetBaseline({
      title: asset.title.trim(),
      description: (asset.description ?? "").trim(),
      body: (asset.body ?? "").trim(),
      cover_url: asset.cover_url,
      featured: asset.featured,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, {
        folder: "blogs/covers",
        onProgress: setProgress,
      });
      setCoverUrl(uploaded.url);
      setProgress(100);
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to upload cover.");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!dirty) return;
    if (!title.trim()) {
      onError("Title is required.");
      return;
    }
    if (!body.trim()) {
      onError("Blog body is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        body: body.trim(),
        cover_url: coverUrl,
        category: "blog",
        featured,
        published: true,
      };
      if (isEditing && editingId !== null) {
        await apiFetch(`/admin/media/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        onSuccess("Blog post updated.");
      } else {
        await apiFetch("/admin/media", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onSuccess("Blog post published.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save blog post.");
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
      onError(err instanceof ApiError ? err.detail : "Unable to update blog post.");
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    const ok = await askConfirm({
      title: "Delete blog post?",
      description: `Remove “${asset.title}” from the media library?`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/media/${asset.id}`, { method: "DELETE" });
      if (editingId === asset.id) clearForm();
      onSuccess("Blog post deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete blog post.");
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <div ref={formRef}>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            {isEditing ? "Edit blog post" : "Write blog post"}
          </h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Published posts appear under Resources → Blog on the public site.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <FormField label="Title">
            <input
              className={fieldClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving || uploading}
            />
          </FormField>
          <FormField label="Short summary" hint="Shown on the blog listing cards.">
            <textarea
              className={textAreaClassName}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving || uploading}
            />
          </FormField>
          <FormField label="Body">
            <textarea
              className={textAreaClassName}
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={saving || uploading}
              placeholder="Write the full article…"
            />
          </FormField>
          <FormField label="Cover image">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={saving || uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadCover(file);
              }}
            />
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => coverInputRef.current?.click()}
              className="rounded-md border-2 border-ifma-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-50"
            >
              {coverUrl ? "Replace cover" : "Upload cover"}
            </button>
            {uploading ? (
              <div className="mt-3">
                <ProgressBar value={progress} />
              </div>
            ) : null}
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="mt-3 aspect-[16/9] max-w-md rounded-[16px] object-cover" />
            ) : null}
          </FormField>
          <label className="flex items-center gap-2 text-sm font-medium text-caisbe-text">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              disabled={saving}
            />
            Featured
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <SaveButton
            dirty={dirty}
            saving={saving}
            disabled={uploading}
            idleLabel={isEditing ? "Save changes" : "Publish post"}
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
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Blog posts</h2>
        {loading ? (
          <Skeleton className="mt-4 h-24" />
        ) : assets.length === 0 ? (
          <EmptyState title="No blog posts yet" description="Write and publish a post above." />
        ) : (
          <ul className="mt-4 divide-y divide-ifma-border-light">
            {assets.map((asset) => (
              <li key={asset.id} className="flex flex-wrap items-center gap-4 py-4">
                {asset.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.cover_url} alt="" className="h-16 w-28 rounded-md object-cover" />
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center rounded-md bg-admin-surface-muted text-[10px] font-bold uppercase text-caisbe-muted">
                    Blog
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
                  <EditIconButton label="Edit post" onClick={() => startEdit(asset)} />
                  <DeleteIconButton label="Delete post" onClick={() => void deleteAsset(asset)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
