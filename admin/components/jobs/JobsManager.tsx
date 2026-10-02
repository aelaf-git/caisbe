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
import { apiFetch, apiUpload, ApiError, type JobPosting } from "@/lib/auth";

const ATTACH_ACCEPT =
  "application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/*,.jpg,.jpeg,.png,.webp";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function resetFileInput(ref: RefObject<HTMLInputElement | null>) {
  if (ref.current) ref.current.value = "";
}

function toInputDate(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fromInputDate(value: string, endOfDay = false) {
  if (!value) return null;
  return endOfDay ? `${value}T23:59:59.000Z` : `${value}T12:00:00.000Z`;
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpiryInput() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function JobsManager({
  jobs,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  jobs: JobPosting[];
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [postedOn, setPostedOn] = useState(todayInput());
  const [expiresOn, setExpiresOn] = useState(defaultExpiryInput());
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);

  const isEditing = editingId !== null;

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setCompany("");
    setLocation("");
    setEmploymentType("full-time");
    setSummary("");
    setDescription("");
    setApplyUrl("");
    setAttachmentUrl(null);
    setPostedOn(todayInput());
    setExpiresOn(defaultExpiryInput());
    setPublished(true);
    setFeatured(false);
    setUploadProgress(0);
    resetFileInput(fileInputRef);
  }

  function startEdit(job: JobPosting) {
    setEditingId(job.id);
    setTitle(job.title);
    setCompany(job.company ?? "");
    setLocation(job.location ?? "");
    setEmploymentType(job.employment_type || "full-time");
    setSummary(job.summary ?? "");
    setDescription(job.description ?? "");
    setApplyUrl(job.apply_url ?? "");
    setAttachmentUrl(job.attachment_url);
    setPostedOn(toInputDate(job.posted_on));
    setExpiresOn(toInputDate(job.expires_on));
    setPublished(job.published);
    setFeatured(job.featured);
    resetFileInput(fileInputRef);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadAttachment(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await apiUpload("/admin/uploads", file, {
        onProgress: (percent) => setUploadProgress(percent),
      });
      setAttachmentUrl(uploaded.url);
      setUploadProgress(100);
      onSuccess("Job attachment uploaded.");
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!title.trim() || !postedOn || !expiresOn) {
      onError("Title, upload date, and expiry date are required.");
      return;
    }
    if (expiresOn < postedOn) {
      onError("Expiry date must be on or after the upload date.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        company: company.trim() || null,
        location: location.trim() || null,
        employment_type: employmentType,
        summary: summary.trim() || null,
        description: description.trim() || null,
        apply_url: applyUrl.trim() || null,
        attachment_url: attachmentUrl,
        source_label: "manual",
        posted_on: fromInputDate(postedOn),
        expires_on: fromInputDate(expiresOn, true),
        published,
        featured,
      };
      if (isEditing) {
        await apiFetch(`/admin/jobs/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onSuccess("Job updated.");
      } else {
        await apiFetch("/admin/jobs", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onSuccess("Job created.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save job.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob(job: JobPosting) {
    const ok = await askConfirm({
      title: "Delete job?",
      description: `Remove “${job.title}” from the job board.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/jobs/${job.id}`, { method: "DELETE" });
      onSuccess("Job deleted.");
      if (editingId === job.id) clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete job.");
    }
  }

  return (
    <div className="space-y-6">
      <div ref={formRef}>
        <Card className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
              {isEditing ? "Edit job" : "Upload job"}
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Manually add openings for the CAISBE Job Board. Set an upload date
              and expiry date—listings disappear from the public board after
              expiry.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Job title">
              <input
                className={fieldClassName}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>
            <FormField label="Company">
              <input
                className={fieldClassName}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </FormField>
            <FormField label="Location">
              <input
                className={fieldClassName}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </FormField>
            <FormField label="Employment type">
              <select
                className={fieldClassName}
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="temporary">Temporary</option>
              </select>
            </FormField>
            <FormField label="Upload / post date">
              <input
                type="date"
                className={fieldClassName}
                value={postedOn}
                onChange={(e) => setPostedOn(e.target.value)}
              />
            </FormField>
            <FormField label="Expiry date">
              <input
                type="date"
                className={fieldClassName}
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
              />
            </FormField>
            <FormField label="Apply URL (optional)">
              <input
                className={fieldClassName}
                placeholder="https://example.com/careers/job"
                value={applyUrl}
                onChange={(e) => setApplyUrl(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Short summary">
            <textarea
              className={textAreaClassName}
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </FormField>
          <FormField label="Full description (optional)">
            <textarea
              className={textAreaClassName}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>

          <div className="space-y-2">
            <p className="text-sm font-medium text-caisbe-text-dark">
              Job description file (optional)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACH_ACCEPT}
              disabled={uploading || saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAttachment(file);
              }}
            />
            {uploading ? <ProgressBar value={uploadProgress} /> : null}
            {attachmentUrl ? (
              <p className="text-xs text-caisbe-muted">
                Attached:{" "}
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-caisbe-red"
                >
                  View file
                </a>{" "}
                ·{" "}
                <button
                  type="button"
                  className="font-semibold text-caisbe-red"
                  onClick={() => setAttachmentUrl(null)}
                >
                  Remove
                </button>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Published
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Featured
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void save()} disabled={saving || uploading}>
              {saving ? "Saving…" : isEditing ? "Update job" : "Create job"}
            </Button>
            {isEditing ? (
              <Button variant="secondary" onClick={clearForm} disabled={saving}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-ifma-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            Job listings
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="Upload the first facility management opening with post and expiry dates."
          />
        ) : (
          <ul className="divide-y divide-ifma-border">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-caisbe-text-dark">{job.title}</p>
                    <Badge tone={job.published ? "success" : "neutral"}>
                      {job.published ? "Published" : "Draft"}
                    </Badge>
                    {job.is_expired ? (
                      <Badge tone="warning">Expired</Badge>
                    ) : (
                      <Badge tone="info">Active</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-caisbe-muted">
                    Posted {toInputDate(job.posted_on)} · Expires{" "}
                    {toInputDate(job.expires_on)}
                    {job.company ? ` · ${job.company}` : ""}
                    {job.location ? ` · ${job.location}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <EditIconButton
                    label={`Edit ${job.title}`}
                    onClick={() => startEdit(job)}
                  />
                  <DeleteIconButton
                    label={`Delete ${job.title}`}
                    onClick={() => void deleteJob(job)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
