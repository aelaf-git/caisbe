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

export default function PodcastManager({
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
  const audioInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "audio" | null>(null);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);

  const isEditing = editingId !== null;

  const formValues = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim(),
      external_url: externalUrl.trim(),
      file_url: fileUrl,
      cover_url: coverUrl,
      featured,
    }),
    [title, description, externalUrl, fileUrl, coverUrl, featured],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setExternalUrl("");
    setFileUrl(null);
    setCoverUrl(null);
    setFeatured(false);
    setProgress(0);
    resetFileInput(coverInputRef);
    resetFileInput(audioInputRef);
    resetBaseline({
      title: "",
      description: "",
      external_url: "",
      file_url: null,
      cover_url: null,
      featured: false,
    });
  }

  function startEdit(asset: MediaAsset) {
    setEditingId(asset.id);
    setTitle(asset.title);
    setDescription(asset.description ?? "");
    setExternalUrl(asset.external_url ?? "");
    setFileUrl(asset.file_url);
    setCoverUrl(asset.cover_url);
    setFeatured(asset.featured);
    resetBaseline({
      title: asset.title.trim(),
      description: (asset.description ?? "").trim(),
      external_url: (asset.external_url ?? "").trim(),
      file_url: asset.file_url,
      cover_url: asset.cover_url,
      featured: asset.featured,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function upload(file: File, kind: "cover" | "audio") {
    setUploading(kind);
    setProgress(0);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, {
        folder: kind === "cover" ? "podcasts/covers" : "podcasts",
        onProgress: setProgress,
      });
      if (kind === "cover") setCoverUrl(uploaded.url);
      else {
        setFileUrl(uploaded.url);
        if (!externalUrl.trim()) setExternalUrl(uploaded.url);
        if (!title.trim()) setTitle(uploaded.filename.replace(/\.[^.]+$/, ""));
      }
      setProgress(100);
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to upload file.");
      setProgress(0);
    } finally {
      setUploading(null);
    }
  }

  async function submit() {
    if (!dirty) return;
    if (!title.trim()) {
      onError("Title is required.");
      return;
    }
    if (!externalUrl.trim() && !fileUrl) {
      onError("Add an episode URL or upload an audio file.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        external_url: externalUrl.trim() || fileUrl,
        file_url: fileUrl,
        cover_url: coverUrl,
        category: "podcast",
        featured,
        published: true,
      };
      if (isEditing && editingId !== null) {
        await apiFetch(`/admin/media/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        onSuccess("Podcast episode updated.");
      } else {
        await apiFetch("/admin/media", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onSuccess("Podcast episode published.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save podcast.");
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
      onError(err instanceof ApiError ? err.detail : "Unable to update podcast.");
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    const ok = await askConfirm({
      title: "Delete podcast episode?",
      description: `Remove “${asset.title}” from the media library?`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/media/${asset.id}`, { method: "DELETE" });
      if (editingId === asset.id) clearForm();
      onSuccess("Podcast episode deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete podcast.");
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <div ref={formRef}>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            {isEditing ? "Edit podcast episode" : "Add podcast episode"}
          </h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Link Spotify, Apple Podcasts, YouTube, or upload an audio file. Add a cover image when possible.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <FormField label="Title">
            <input
              className={fieldClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving || uploading !== null}
            />
          </FormField>
          <FormField label="Episode URL" hint="Spotify, Apple, YouTube, or other listen link.">
            <input
              className={fieldClassName}
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              disabled={saving || uploading !== null}
              placeholder="https://…"
            />
          </FormField>
          <div className="lg:col-span-2">
            <FormField label="Description">
              <textarea
                className={textAreaClassName}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving || uploading !== null}
              />
            </FormField>
          </div>
          <FormField label="Cover image">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={saving || uploading !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file, "cover");
              }}
            />
            <button
              type="button"
              disabled={saving || uploading !== null}
              onClick={() => coverInputRef.current?.click()}
              className="rounded-md border-2 border-ifma-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-50"
            >
              {coverUrl ? "Replace cover" : "Upload cover"}
            </button>
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="mt-3 h-28 w-28 rounded-md object-cover" />
            ) : null}
          </FormField>
          <FormField label="Audio upload (optional)">
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav"
              className="sr-only"
              disabled={saving || uploading !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file, "audio");
              }}
            />
            <button
              type="button"
              disabled={saving || uploading !== null}
              onClick={() => audioInputRef.current?.click()}
              className="rounded-md border-2 border-ifma-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-50"
            >
              {fileUrl ? "Replace audio" : "Upload audio"}
            </button>
            {uploading ? (
              <div className="mt-3">
                <ProgressBar value={progress} />
              </div>
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
            disabled={uploading !== null}
            idleLabel={isEditing ? "Save changes" : "Publish episode"}
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
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Podcast episodes</h2>
        {loading ? (
          <Skeleton className="mt-4 h-24" />
        ) : assets.length === 0 ? (
          <EmptyState title="No podcasts yet" description="Add an episode link or audio file above." />
        ) : (
          <ul className="mt-4 divide-y divide-ifma-border-light">
            {assets.map((asset) => (
              <li key={asset.id} className="flex flex-wrap items-center gap-4 py-4">
                {asset.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.cover_url} alt="" className="h-16 w-16 rounded-md object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md bg-admin-surface-muted text-[10px] font-bold uppercase text-caisbe-muted">
                    Audio
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
                  <EditIconButton label="Edit episode" onClick={() => startEdit(asset)} />
                  <DeleteIconButton label="Delete episode" onClick={() => void deleteAsset(asset)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
