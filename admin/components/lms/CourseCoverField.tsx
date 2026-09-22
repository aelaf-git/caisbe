"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { apiUpload, ApiError } from "@/lib/auth";

const COVER_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

const COVER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function isCoverImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const name = file.name.toLowerCase();
  return [...COVER_EXTENSIONS].some((ext) => name.endsWith(ext));
}

export default function CourseCoverField({
  value,
  onChange,
  onError,
  saving = false,
}: {
  value: string | null;
  onChange: (url: string | null) => void | Promise<void>;
  onError: (message: string) => void;
  saving?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const busy = uploading || saving;

  async function handleFile(file: File) {
    if (!isCoverImage(file)) {
      onError("Cover must be a JPG, PNG, WebP, or GIF image.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await apiUpload("/admin/uploads", file);
      await onChange(uploaded.url);
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to upload cover image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <FormField
      label="Cover image"
      hint="Autosaves as a draft. For published courses, click Save changes to push the cover to the student portal."
    >
      <div className="overflow-hidden border border-ifma-border bg-admin-surface-muted/40">
        <div className="relative aspect-video bg-[#f3f0ec]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Course cover preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-caisbe-muted">
              No cover image yet
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-ifma-border-light bg-white px-4 py-3">
          <input
            ref={inputRef}
            type="file"
            accept={COVER_ACCEPT}
            disabled={busy}
            className="block w-full min-w-0 flex-1 text-sm text-caisbe-muted file:mr-3 file:rounded-md file:border-0 file:bg-caisbe-red file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white hover:file:bg-caisbe-red-dark disabled:opacity-60 sm:w-auto"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {value ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => {
                void onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove
            </Button>
          ) : null}
          {uploading ? (
            <span className="text-xs font-medium text-caisbe-muted">Uploading…</span>
          ) : saving ? (
            <span className="text-xs font-medium text-caisbe-muted">Saving draft…</span>
          ) : null}
        </div>
      </div>
    </FormField>
  );
}
