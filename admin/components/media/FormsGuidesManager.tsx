"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import ProgressBar from "@/components/ui/ProgressBar";
import SaveButton from "@/components/ui/SaveButton";
import Skeleton from "@/components/ui/Skeleton";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, apiUpload, ApiError, type MediaAsset } from "@/lib/auth";

const FORM_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.epub,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/epub+zip";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

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

function resetFileInput(ref: RefObject<HTMLInputElement | null>) {
  if (ref.current) ref.current.value = "";
}

export default function FormsGuidesManager({
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(true);

  const isEditing = editingId !== null;
  const formValues = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim(),
      file_url: fileUrl,
      published,
    }),
    [title, description, fileUrl, published],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setFileUrl(null);
    setPublished(true);
    setFileProgress(0);
    resetFileInput(fileInputRef);
    resetBaseline({
      title: "",
      description: "",
      file_url: null,
      published: true,
    });
  }

  function startEdit(asset: MediaAsset) {
    setEditingId(asset.id);
    setTitle(asset.title);
    setDescription(asset.description || "");
    setFileUrl(asset.file_url);
    setPublished(asset.published);
    setFileProgress(asset.file_url ? 100 : 0);
    resetBaseline({
      title: asset.title.trim(),
      description: (asset.description || "").trim(),
      file_url: asset.file_url,
      published: asset.published,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setFileProgress(0);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, {
        folder: "forms",
        onProgress: setFileProgress,
      });
      setFileUrl(uploaded.url);
      setFileProgress(100);
      if (!title.trim()) {
        const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        if (base) setTitle(base);
      }
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to upload file.");
      setFileProgress(0);
    } finally {
      setUploading(false);
      resetFileInput(fileInputRef);
    }
  }

  async function submitForm() {
    if (!dirty) return;
    if (!fileUrl) {
      onError("Upload a form or guide file first.");
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
            published,
          }),
        });
        onSuccess("Form/guide updated.");
      } else {
        await apiFetch("/admin/media", {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            file_url: fileUrl,
            category: "forms",
            published,
          }),
        });
        onSuccess(published ? "Form/guide published." : "Form/guide saved as draft.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.detail
          : isEditing
            ? "Unable to update form/guide."
            : "Unable to save form/guide.",
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
      if (editingId === asset.id) setPublished(!asset.published);
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update form/guide.");
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    const ok = await askConfirm({
      title: "Delete form or guide?",
      description: `Remove “${asset.title}” from Forms and Guides? Visitors will no longer be able to download it.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/media/${asset.id}`, { method: "DELETE" });
      if (editingId === asset.id) clearForm();
      onSuccess("Form/guide deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete form/guide.");
    }
  }

  const sorted = useMemo(
    () => [...assets].sort((a, b) => a.sort_order - b.sort_order || b.id - a.id),
    [assets],
  );

  return (
    <div className="space-y-8">
      <Card>
        <div ref={formRef}>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            {isEditing ? "Edit form or guide" : "Upload form or guide"}
          </h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Published files appear on the website under Resources → Forms and Guides for download.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <FormField
            label="Document file"
            hint={
              uploading
                ? `Uploading… ${fileProgress}%`
                : fileUrl
                  ? fileLabelFromUrl(fileUrl)
                  : "PDF, Word, Excel, PowerPoint, or EPUB"
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={FORM_ACCEPT}
              disabled={uploading || saving}
              onChange={(event) => void uploadFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-caisbe-muted file:mr-4 file:border-0 file:bg-caisbe-green file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white hover:file:bg-caisbe-green-mid"
            />
            {uploading ? <ProgressBar value={fileProgress} className="mt-2" /> : null}
            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-caisbe-red hover:underline"
              >
                Preview current file
              </a>
            ) : null}
          </FormField>

          <FormField label="Title">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldClassName}
              placeholder="Membership application form"
            />
          </FormField>

          <FormField label="Description" hint="Optional short note about when to use this file">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={textAreaClassName}
              rows={3}
              placeholder="Short note about when to use this form or guide"
            />
          </FormField>

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-caisbe-text">
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              className="size-4 rounded border-ifma-border text-caisbe-green focus:ring-caisbe-green"
            />
            Published on the website
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <SaveButton
            dirty={dirty}
            saving={saving || uploading}
            idleLabel={isEditing ? "Save changes" : "Save form/guide"}
            onClick={() => void submitForm()}
          />
          {isEditing ? (
            <Button variant="secondary" disabled={saving || uploading} onClick={clearForm}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </Card>

      <Card padding="none" className="overflow-x-auto">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Forms and guides</h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            {loading ? "Loading…" : `${sorted.length} document${sorted.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-14" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No forms or guides yet"
              description="Upload a PDF or Office document to make it available for download on the website."
            />
          </div>
        ) : (
          <table className="min-w-[720px] w-full divide-y divide-ifma-border-light text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Title</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Status</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">File</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {sorted.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-caisbe-text">{asset.title}</p>
                    {asset.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-caisbe-muted">{asset.description}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => void togglePublished(asset)}>
                      <Badge tone={asset.published ? "success" : "neutral"}>
                        {asset.published ? "Published" : "Draft"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {asset.file_url ? (
                      <a
                        href={asset.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-caisbe-red hover:underline"
                      >
                        {fileLabelFromUrl(asset.file_url) || "Download"}
                      </a>
                    ) : (
                      <span className="text-caisbe-muted">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <EditIconButton label={`Edit ${asset.title}`} onClick={() => startEdit(asset)} />
                      <DeleteIconButton
                        label={`Delete ${asset.title}`}
                        onClick={() => void deleteAsset(asset)}
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
