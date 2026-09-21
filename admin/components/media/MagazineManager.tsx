"use client";

import { useRef, useState } from "react";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, apiUpload, ApiError, type MediaAsset } from "@/lib/auth";

const MAGAZINE_ACCEPT =
  "application/pdf,.pdf,image/*,.jpg,.jpeg,.png,.webp,.gif,application/epub+zip,.epub";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

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
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);

  async function uploadFile(file: File, kind: "file" | "cover") {
    setUploading(true);
    try {
      const uploaded = await apiUpload("/admin/uploads", file);
      if (kind === "file") {
        setFileUrl(uploaded.url);
        if (!title.trim()) setTitle(uploaded.filename.replace(/\.[^.]+$/, ""));
      } else {
        setCoverUrl(uploaded.url);
      }
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function createMagazine() {
    if (!fileUrl) {
      onError("Upload a magazine PDF or EPUB first.");
      return;
    }
    if (!title.trim()) {
      onError("Title is required.");
      return;
    }
    try {
      await apiFetch("/admin/media", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          file_url: fileUrl,
          cover_url: coverUrl,
          category: "magazine",
          published,
          featured,
        }),
      });
      setTitle("");
      setDescription("");
      setFileUrl(null);
      setCoverUrl(null);
      setPublished(true);
      setFeatured(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (coverInputRef.current) coverInputRef.current.value = "";
      onSuccess("Magazine issue added.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save magazine.");
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
      onSuccess("Magazine issue deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete magazine.");
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Add magazine issue</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          Upload a PDF or EPUB. Published issues appear on the website landing page and magazine page.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <FormField label="Magazine file" hint={fileUrl ? "Upload complete — file is ready." : "PDF or EPUB recommended."}>
            <input
              ref={fileInputRef}
              type="file"
              accept={MAGAZINE_ACCEPT}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file, "file");
              }}
              className="block w-full text-sm text-caisbe-muted file:mr-4 file:border-0 file:bg-caisbe-green file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white hover:file:bg-caisbe-green-mid"
            />
            {fileUrl ? (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-caisbe-green hover:underline">
                File ready — open preview
              </a>
            ) : null}
          </FormField>

          <FormField label="Cover image" hint="Optional; JPG, PNG, WebP, or GIF.">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file, "cover");
              }}
              className="block w-full text-sm text-caisbe-muted file:mr-4 file:border-0 file:border-ifma-border file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-caisbe-text hover:file:border-caisbe-green"
            />
            {coverUrl ? (
              <a href={coverUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-caisbe-green hover:underline">
                Cover ready — open preview
              </a>
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

        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-caisbe-text">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="size-4 rounded border-ifma-border text-caisbe-green focus:ring-caisbe-green"
            />
            Publish on website
          </label>
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

        <Button
          disabled={uploading}
          onClick={() => void createMagazine()}
          className="mt-6"
        >
          {uploading ? "Uploading…" : "Save magazine issue"}
        </Button>
      </Card>

      <Card padding="none" className="overflow-x-auto">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Magazine issues</h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14" />)}</div>
        ) : assets.length === 0 ? (
          <div className="p-4"><EmptyState title="No magazine issues yet" description="Upload your first issue to publish it on the website." /></div>
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
                <tr key={asset.id}>
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
                      <Badge tone={asset.published ? "success" : "neutral"}>{asset.published ? "Published" : "Draft"}</Badge>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => void toggleField(asset, "featured")}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-caisbe-red/15"
                    >
                      <Badge tone={asset.featured ? "brand" : "neutral"}>{asset.featured ? "Featured" : "No"}</Badge>
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
                    <DeleteIconButton
                      label={`Delete ${asset.title}`}
                      onClick={() => void deleteAsset(asset)}
                    />
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
