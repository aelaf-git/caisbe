"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName } from "@/components/ui/FormField";
import ProgressBar from "@/components/ui/ProgressBar";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, apiUpload, ApiError, type MediaAsset } from "@/lib/auth";

const HERO_ACCEPT =
  "image/*,.jpg,.jpeg,.png,.webp,.gif,video/*,.mp4,.webm,.mov,.m4v";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function resolveMediaSrc(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/images/")) return `${SITE_URL}${url}`;
  return url;
}

function fileLabelFromUrl(url: string | null): string {
  if (!url) return "";
  const path = url.split("?")[0] ?? url;
  const name = path.split("/").pop() ?? path;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function isVideoUrl(url: string | null): boolean {
  if (!url) return false;
  const path = url.split("?")[0] ?? "";
  return VIDEO_EXT.test(path);
}

function isImageUrl(url: string | null): boolean {
  if (!url) return false;
  const path = url.split("?")[0] ?? "";
  return IMAGE_EXT.test(path);
}

function resetFileInput(ref: RefObject<HTMLInputElement | null>) {
  if (ref.current) ref.current.value = "";
}

export default function HeroManager({
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [transitionSeconds, setTransitionSeconds] = useState(3);
  const [savedTransitionSeconds, setSavedTransitionSeconds] = useState(3);
  const [transitionSaving, setTransitionSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const isEditing = editingId !== null;
  const sorted = [...assets].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const publishedCount = sorted.filter((a) => a.published).length;
  const transitionDirty = settingsLoaded && transitionSeconds !== savedTransitionSeconds;

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const data = await apiFetch<{ hero_transition_ms?: number }>("/admin/settings");
        if (cancelled) return;
        const ms = data.hero_transition_ms ?? 3000;
        const seconds = Math.max(1, Math.min(60, Math.round(ms / 1000)));
        setTransitionSeconds(seconds);
        setSavedTransitionSeconds(seconds);
        setSettingsLoaded(true);
      } catch {
        if (!cancelled) setSettingsLoaded(true);
      }
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setFileUrl(null);
    setSortOrder(sorted.length > 0 ? Math.max(...sorted.map((a) => a.sort_order)) + 1 : 0);
    setFileProgress(0);
    setFormError(null);
    resetFileInput(fileInputRef);
  }

  function openAddForm() {
    clearForm();
    setSortOrder(sorted.length > 0 ? Math.max(...sorted.map((a) => a.sort_order)) + 1 : 0);
    setShowForm(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function closeForm() {
    clearForm();
    setShowForm(false);
  }

  function startEdit(asset: MediaAsset) {
    setEditingId(asset.id);
    setTitle(asset.title);
    setFileUrl(asset.file_url);
    setSortOrder(asset.sort_order);
    setFileProgress(0);
    setFormError(null);
    resetFileInput(fileInputRef);
    setShowForm(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setFileProgress(0);
    setFormError(null);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, {
        onProgress: (percent) => setFileProgress(percent),
      });
      setFileUrl(uploaded.url);
      setFileProgress(100);
      if (!title.trim()) setTitle(uploaded.filename.replace(/\.[^.]+$/, ""));
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to upload file.");
      setFileProgress(0);
    } finally {
      setUploading(false);
    }
  }

  async function saveTransition() {
    const seconds = Math.max(1, Math.min(60, Math.round(transitionSeconds) || 3));
    setTransitionSeconds(seconds);
    setTransitionSaving(true);
    try {
      await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ hero_transition_ms: seconds * 1000 }),
      });
      setSavedTransitionSeconds(seconds);
      onSuccess(`Carousel transition set to ${seconds}s.`);
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save transition time.");
    } finally {
      setTransitionSaving(false);
    }
  }

  async function submitSlide() {
    if (!fileUrl) {
      setFormError("Choose an image or video before publishing.");
      return;
    }
    if (!title.trim()) {
      setFormError("Title is required (used as alt text).");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      if (isEditing && editingId !== null) {
        await apiFetch(`/admin/media/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            file_url: fileUrl,
            sort_order: sortOrder,
          }),
        });
        onSuccess("Hero slide updated.");
      } else {
        await apiFetch("/admin/media", {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            file_url: fileUrl,
            category: "hero",
            published: true,
            featured: false,
            sort_order: sortOrder,
          }),
        });
        onSuccess("Hero slide published.");
      }
      closeForm();
      await onRefresh();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.detail
          : isEditing
            ? "Unable to update slide."
            : "Unable to publish slide.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(asset: MediaAsset) {
    try {
      await apiFetch(`/admin/media/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !asset.published }),
      });
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update slide.");
    }
  }

  async function moveSlide(asset: MediaAsset, direction: -1 | 1) {
    const index = sorted.findIndex((a) => a.id === asset.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;
    try {
      await Promise.all([
        apiFetch(`/admin/media/${asset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ sort_order: swapWith.sort_order }),
        }),
        apiFetch(`/admin/media/${swapWith.id}`, {
          method: "PATCH",
          body: JSON.stringify({ sort_order: asset.sort_order }),
        }),
      ]);
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to reorder slides.");
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    const ok = await askConfirm({
      title: "Delete hero slide?",
      description: `Remove “${asset.title}” from the homepage carousel? Deleted slides are not restored automatically.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/media/${asset.id}`, { method: "DELETE" });
      if (editingId === asset.id) closeForm();
      onSuccess("Hero slide deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete slide.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border border-ifma-border bg-admin-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-caisbe-text-dark">Homepage hero</p>
          <p className="mt-0.5 text-sm text-caisbe-muted">
            {loading
              ? "Loading slides…"
              : `${publishedCount} published · ${sorted.length} total`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-caisbe-text">
            <span className="whitespace-nowrap text-caisbe-muted">Transition</span>
            <input
              type="number"
              min={1}
              max={60}
              step={1}
              value={transitionSeconds}
              disabled={!settingsLoaded || transitionSaving}
              onChange={(e) => setTransitionSeconds(Number(e.target.value))}
              className={`${fieldClassName} w-16`}
              aria-label="Transition seconds"
            />
            <span className="text-caisbe-muted">sec</span>
          </label>
          {transitionDirty ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!settingsLoaded || transitionSaving}
              onClick={() => void saveTransition()}
            >
              {transitionSaving ? "Saving…" : "Save"}
            </Button>
          ) : null}
          <Button type="button" disabled={uploading || saving} onClick={openAddForm}>
            Add slide
          </Button>
        </div>
      </div>

      {showForm ? (
        <Card>
          <div ref={formRef} className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
                {isEditing ? "Edit slide" : "New slide"}
              </h2>
              <p className="mt-1 text-sm text-caisbe-muted">
                {isEditing
                  ? "Update media or title, then save."
                  : "Upload a file, add a title, then publish."}
              </p>
            </div>
            <Button type="button" variant="secondary" disabled={uploading || saving} onClick={closeForm}>
              Close
            </Button>
          </div>

          {formError ? (
            <p className="mt-4 border border-caisbe-red/30 bg-caisbe-red/5 px-3 py-2 text-sm text-caisbe-red">
              {formError}
            </p>
          ) : null}

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
            <FormField
              label="Media"
              hint={
                uploading
                  ? `Uploading… ${fileProgress}%`
                  : fileUrl
                    ? "Replace to change file."
                    : "Image or video"
              }
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={HERO_ACCEPT}
                disabled={uploading || saving}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
              {fileUrl ? (
                <div className="overflow-hidden border border-ifma-border">
                  <div className="aspect-video bg-[#f3f0ec]">
                    {isVideoUrl(fileUrl) ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={resolveMediaSrc(fileUrl)}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : isImageUrl(fileUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaSrc(fileUrl)}
                        alt={title || "Hero preview"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-3 text-center text-sm text-caisbe-muted">
                        {fileLabelFromUrl(fileUrl)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={uploading || saving}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-t border-ifma-border-light px-3 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:text-caisbe-red disabled:opacity-50"
                  >
                    Replace file
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading || saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-video w-full items-center justify-center border border-dashed border-ifma-border bg-admin-surface-muted/40 text-sm font-semibold text-caisbe-green hover:border-caisbe-green disabled:opacity-50"
                >
                  Choose file
                </button>
              )}
              {uploading ? (
                <div className="mt-2">
                  <ProgressBar value={fileProgress} />
                </div>
              ) : null}
            </FormField>

            <div className="space-y-4">
              <FormField label="Title" hint="Alt text on the homepage">
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormError(null);
                  }}
                  className={fieldClassName}
                  placeholder="Campus aerial view"
                  disabled={uploading || saving}
                />
              </FormField>
              <FormField label="Sort order" hint="Lower numbers appear first">
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className={`${fieldClassName} max-w-[8rem]`}
                  disabled={uploading || saving}
                />
              </FormField>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button disabled={uploading || saving} onClick={() => void submitSlide()}>
                  {uploading
                    ? "Uploading…"
                    : saving
                      ? "Saving…"
                      : isEditing
                        ? "Save changes"
                        : "Publish slide"}
                </Button>
                <Button type="button" variant="secondary" disabled={uploading || saving} onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="aspect-[16/10]" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState
            title="No hero slides"
            description="Add a slide to show a carousel on the homepage."
          />
          <div className="mt-4">
            <Button onClick={openAddForm}>Add slide</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((asset, index) => (
            <article
              key={asset.id}
              className={`overflow-hidden border bg-admin-surface ${
                editingId === asset.id ? "border-caisbe-red" : "border-ifma-border"
              }`}
            >
              <div className="relative aspect-[16/10] bg-[#f3f0ec]">
                {isVideoUrl(asset.file_url) ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={resolveMediaSrc(asset.file_url)}
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaSrc(asset.file_url)}
                    alt={asset.title}
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute left-2 top-2">
                  <button
                    type="button"
                    onClick={() => void togglePublished(asset)}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-caisbe-red/15"
                  >
                    <Badge tone={asset.published ? "success" : "neutral"}>
                      {asset.published ? "Published" : "Draft"}
                    </Badge>
                  </button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="font-semibold text-caisbe-text-dark">{asset.title}</p>
                  <p className="mt-0.5 text-xs text-caisbe-muted">
                    {isVideoUrl(asset.file_url) ? "Video" : "Image"} · order {asset.sort_order}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0 || uploading || saving}
                      onClick={() => void moveSlide(asset, -1)}
                      className="rounded border border-ifma-border px-2 py-1 text-xs font-semibold disabled:opacity-40"
                      aria-label="Move earlier"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === sorted.length - 1 || uploading || saving}
                      onClick={() => void moveSlide(asset, 1)}
                      className="rounded border border-ifma-border px-2 py-1 text-xs font-semibold disabled:opacity-40"
                      aria-label="Move later"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <EditIconButton
                      label={`Edit ${asset.title}`}
                      onClick={() => startEdit(asset)}
                      disabled={uploading || saving}
                    />
                    <DeleteIconButton
                      label={`Delete ${asset.title}`}
                      onClick={() => void deleteAsset(asset)}
                      disabled={uploading || saving}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
