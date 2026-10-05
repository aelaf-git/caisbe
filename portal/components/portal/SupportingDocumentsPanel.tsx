"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

const SUPPORTING_ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export type UserDocument = {
  id: number;
  label: string;
  file_name: string;
  file_url: string;
  created_at?: string | null;
};

export default function SupportingDocumentsPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const rows = await apiFetch<UserDocument[]>("/me/documents");
        if (active) setDocuments(rows);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load documents.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: UserDocument[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("label", "Supporting document");
        const row = await apiFetch<UserDocument>("/me/documents", { method: "POST", body });
        uploaded.push(row);
      }
      setDocuments((current) => [...uploaded, ...current]);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to upload document.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeDocument(id: number) {
    setError(null);
    setRemovingId(id);
    try {
      await apiFetch(`/me/documents/${id}`, { method: "DELETE" });
      setDocuments((current) => current.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to remove document.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Supporting documents</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          Attach PDF, Word, or image files for your membership profile. You can add multiple files and remove any
          you no longer need. Admins can view these on your student record.
        </p>
      </div>
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-caisbe-muted">Loading documents…</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-caisbe-muted">No supporting documents attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-ifma-border-light bg-admin-surface-muted/40 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <a
                  href={resolveUploadUrl(doc.file_url) ?? doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-caisbe-red underline"
                >
                  {doc.file_name}
                </a>
                <p className="text-xs text-caisbe-muted">{doc.label}</p>
              </div>
              <button
                type="button"
                disabled={removingId === doc.id}
                onClick={() => void removeDocument(doc.id)}
                className="h-9 shrink-0 rounded-md border border-ifma-border bg-white px-3 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:bg-admin-surface-muted disabled:opacity-60"
              >
                {removingId === doc.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="block text-sm font-semibold text-caisbe-text-dark">
        Add files
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={SUPPORTING_ACCEPT}
          disabled={uploading}
          className="mt-2 block w-full text-sm font-normal text-caisbe-text file:mr-3 file:rounded-full file:border-0 file:bg-caisbe-red file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
          onChange={(e) => void uploadFiles(e.target.files)}
        />
      </label>
      {uploading ? <p className="text-sm text-caisbe-muted">Uploading…</p> : null}
    </div>
  );
}
