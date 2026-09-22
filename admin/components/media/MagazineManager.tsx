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
import { apiFetch, apiUpload, ApiError, type MediaAsset } from "@/lib/auth";

const MAGAZINE_ACCEPT =
  "application/pdf,.pdf,image/*,.jpg,.jpeg,.png,.webp,.gif,application/epub+zip,.epub";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

type UploadKind = "file" | "cover";

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

function isImageUrl(url: string | null): boolean {
  if (!url) return false;
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(png|jpe?g|gif|webp)$/.test(path);
}

function resetFileInput(ref: RefObject<HTMLInputElement | null>) {
  if (ref.current) ref.current.value = "";
}

export default function MagazineManager({
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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<UploadKind | null>(null);
  const [fileProgress, setFileProgress] = useState(0);
  const [coverProgress, setCoverProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);

  const uploading = uploadingKind !== null;
  const isEditing = editingId !== null;

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setFileUrl(null);
    setCoverUrl(null);
    setFeatured(false);
    setFileProgress(0);
    setCoverProgress(0);
    resetFileInput(fileInputRef);
    resetFileInput(coverInputRef);
  }

  function startEdit(asset: MediaAsset) {
    setEditingId(asset.id);
    setTitle(asset.title);
    setDescription(asset.description ?? "");
    setFileUrl(asset.file_url);
    setCoverUrl(asset.cover_url);
    setFeatured(asset.featured);
    setFileProgress(0);
    setCoverProgress(0);
    resetFileInput(fileInputRef);
    resetFileInput(coverInputRef);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadFile(file: File, kind: UploadKind) {
    setUploadingKind(kind);
    if (kind === "file") setFileProgress(0);
    else setCoverProgress(0);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, {
        onProgress: (percent) => {
          if (kind === "file") setFileProgress(percent);
          else setCoverProgress(percent);
        },
      });
      if (kind === "file") {
        setFileUrl(uploaded.url);
        setFileProgress(100);
        if (!title.trim()) setTitle(uploaded.filename.replace(/\.[^.]+$/, ""));
      } else {
        setCoverUrl(uploaded.url);
        setCoverProgress(100);
      }
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to upload file.");
      if (kind === "file") setFileProgress(0);
      else setCoverProgress(0);
    } finally {
      setUploadingKind(null);
    }
  }

  async function submitMagazine() {
    if (!fileUrl) {
      onError("Upload a magazine PDF or EPUB first.");
      return;
    }
    if (!title.trim()) {
      onError("Title is required.");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editingId !== null) {
        await apiFetch(`/admin/media/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            file_url: fileUrl,
            cover_url: coverUrl,
            featured,
          }),
        });
        onSuccess("Magazine issue updated.");
      } else {
        await apiFetch("/admin/media", {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            file_url: fileUrl,
            cover_url: coverUrl,
            category: "magazine",
            published: true,
            featured,
          }),
        });
        onSuccess("Magazine issue published.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.detail
          : isEditing
            ? "Unable to update magazine."
            : "Unable to publish magazine.",
      );
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
      if (editingId === asset.id && field === "featured") {
        setFeatured(!asset.featured);
      }
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update magazine.");
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    const ok = await askConfirm({
      title: "Delete magazine issue?",
      description: `Remove “${asset.title}” from the media library?`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/media/${asset.id}`, { method: "DELETE" });
      if (editingId === asset.id) clearForm();
      onSuccess("Magazine issue deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete magazine.");
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <div ref={formRef}>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            {isEditing ? "Edit magazine issue" : "Add magazine issue"}
          </h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            {isEditing
              ? "Update the file, cover, title, or featured status, then save your changes."
              : "Upload a PDF or EPUB. Published issues appear on the website landing page and magazine page."}
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <FormField
            label="Magazine file"
            hint={
              uploadingKind === "file"
                ? `Uploading… ${fileProgress}%`
                : fileUrl
                  ? "Replace the file to upload a new PDF or EPUB."
                  : "PDF or EPUB recommended."
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={MAGAZINE_ACCEPT}
              disabled={uploading || saving}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file, "file");
              }}
            />
            {fileUrl ? (
              <div className="overflow-hidden border border-ifma-border bg-admin-surface-muted/40">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Current file</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-caisbe-text" title={fileLabelFromUrl(fileUrl)}>
                      {fileLabelFromUrl(fileUrl)}
                    </p>
                  </div>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold uppercase tracking-wide text-caisbe-green hover:underline"
                  >
                    Open
                  </a>
                </div>
                <div className="border-t border-ifma-border-light bg-admin-surface px-4 py-3">
                  <button
                    type="button"
                    disabled={uploading || saving}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md border-2 border-ifma-border bg-admin-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-50"
                  >
                    Replace file
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading || saving}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center rounded-md border-0 bg-caisbe-green px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-caisbe-green-mid disabled:opacity-50"
              >
                Choose file
              </button>
            )}
            {uploadingKind === "file" ? (
              <div className="mt-3 space-y-1.5">
                <ProgressBar value={fileProgress} />
              </div>
            ) : null}
          </FormField>

          <FormField
            label="Cover image"
            hint={
              uploadingKind === "cover"
                ? `Uploading… ${coverProgress}%`
                : coverUrl
                  ? "Replace the cover to upload a new image."
                  : "Optional; JPG, PNG, WebP, or GIF."
            }
          >
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
              disabled={uploading || saving}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file, "cover");
              }}
            />
            {coverUrl ? (
              <div className="overflow-hidden border border-ifma-border bg-admin-surface-muted/40">
                <div className="relative aspect-video bg-[#f3f0ec]">
                  {isImageUrl(coverUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt="Magazine cover" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-caisbe-muted">
                      {fileLabelFromUrl(coverUrl)}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-ifma-border-light bg-admin-surface px-4 py-3">
                  <button
                    type="button"
                    disabled={uploading || saving}
                    onClick={() => coverInputRef.current?.click()}
                    className="rounded-md border-2 border-ifma-border bg-admin-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-50"
                  >
                    Replace cover
                  </button>
                  <button
                    type="button"
                    disabled={uploading || saving}
                    onClick={() => {
                      setCoverUrl(null);
                      setCoverProgress(0);
                      resetFileInput(coverInputRef);
                    }}
                    className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted hover:text-caisbe-red disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading || saving}
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex items-center rounded-md border-2 border-ifma-border bg-admin-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-green disabled:opacity-50"
              >
                Choose cover
              </button>
            )}
            {uploadingKind === "cover" ? (
              <div className="mt-3 space-y-1.5">
                <ProgressBar value={coverProgress} />
              </div>
            ) : null}
          </FormField>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClassName}
              placeholder="CAISBE Magazine — Spring 2026"
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description" hint="Optional summary shown on the landing page card.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={textAreaClassName}
                placeholder="Brief summary for the landing page card."
              />
            </FormField>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-caisbe-text">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="size-4 rounded border-ifma-border text-caisbe-green focus:ring-caisbe-green"
            />
            Feature on landing page
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button disabled={uploading || saving} onClick={() => void submitMagazine()}>
            {uploading ? "Uploading…" : saving ? "Saving…" : isEditing ? "Save changes" : "Publish"}
          </Button>
          {isEditing ? (
            <Button type="button" variant="secondary" disabled={uploading || saving} onClick={clearForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </Card>

      <Card padding="none" className="overflow-x-auto">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Magazine issues</h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14" />)}</div>
        ) : assets.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No magazine issues yet" description="Upload your first issue to publish it on the website." />
          </div>
        ) : (
          <table className="min-w-[720px] w-full divide-y divide-ifma-border-light text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Issue</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Status</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Featured</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">File</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {assets.map((asset) => (
                <tr
                  key={asset.id}
                  className={editingId === asset.id ? "bg-caisbe-red/5" : undefined}
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-caisbe-text">{asset.title}</p>
                    {asset.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-caisbe-muted">{asset.description}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => void toggleField(asset, "published")}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-caisbe-red/15"
                    >
                      <Badge tone={asset.published ? "success" : "neutral"}>
                        {asset.published ? "Published" : "Draft"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => void toggleField(asset, "featured")}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-caisbe-red/15"
                    >
                      <Badge tone={asset.featured ? "brand" : "neutral"}>
                        {asset.featured ? "Featured" : "No"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={asset.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-caisbe-green hover:underline"
                    >
                      Open
                    </a>
                  </td>
                  <td className="px-6 py-4 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
