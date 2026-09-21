"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RichTextEditor from "@/components/lms/RichTextEditor";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName } from "@/components/ui/FormField";
import Skeleton from "@/components/ui/Skeleton";
import {
  apiFetch,
  apiUpload,
  ApiError,
  type NewsletterCampaign,
  type NewsletterSubscriber,
} from "@/lib/auth";

type NewsletterAttachment = {
  filename: string;
  file_url: string;
};

function hasRichTextContent(html: string): boolean {
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length > 0;
}

const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.epub,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip";

export default function NewsletterPanel({
  subscribers,
  campaigns,
  loading,
  onRefresh,
  onError,
  onSuccess,
}: {
  subscribers: NewsletterSubscriber[];
  campaigns: NewsletterCampaign[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<NewsletterAttachment[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // New subscriber data resets the explicit recipient selection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(subscribers.map((row) => row.id));
  }, [subscribers]);

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const allMarked = subscribers.length > 0 && selectedIds.length === subscribers.length;

  function toggleSubscriber(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  }

  function markAll() {
    setSelectedIds(subscribers.map((row) => row.id));
  }

  function unmarkAll() {
    setSelectedIds([]);
  }

  async function attachDocuments(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: NewsletterAttachment[] = [];
      for (const file of Array.from(files)) {
        const result = await apiUpload("/admin/uploads", file);
        uploaded.push({
          filename: result.filename || file.name,
          file_url: result.url,
        });
      }
      setAttachments((current) => [...current, ...uploaded]);
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to attach document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(fileUrl: string) {
    setAttachments((current) => current.filter((item) => item.file_url !== fileUrl));
  }

  async function sendNewsletter() {
    if (!subject.trim()) {
      onError("Subject is required.");
      return;
    }
    if (!hasRichTextContent(bodyHtml)) {
      onError("Message body is required.");
      return;
    }
    if (selectedIds.length === 0) {
      onError("Mark at least one subscriber to send to.");
      return;
    }
    setSending(true);
    try {
      const result = await apiFetch<{ message: string }>("/admin/newsletter/send", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          body_html: bodyHtml.trim(),
          subscriber_ids: selectedIds,
          attachments,
        }),
      });
      setSubject("");
      setBodyHtml("");
      setEditorKey((key) => key + 1);
      setAttachments([]);
      onSuccess(result.message);
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to send newsletter.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            Active subscribers
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
            {loading ? "—" : subscribers.length}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            Campaigns sent
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
            {loading ? "—" : campaigns.length}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Send newsletter</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          Mark subscribers below, then send. Only marked addresses receive the email.
        </p>

        <div className="mt-6 space-y-4">
          <FormField label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={fieldClassName}
              placeholder="CAISBE Newsletter — March 2026"
            />
          </FormField>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Message
            </p>
            <RichTextEditor
              key={editorKey}
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Write your newsletter…"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Attachments
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              multiple
              disabled={uploading || sending}
              onChange={(e) => void attachDocuments(e.target.files)}
              className="block w-full text-sm text-caisbe-muted file:mr-4 file:border-0 file:bg-caisbe-green file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white hover:file:bg-caisbe-green-mid"
            />
            {uploading ? <p className="text-xs text-caisbe-muted">Uploading…</p> : null}
            {attachments.length > 0 ? (
              <ul className="space-y-2">
                {attachments.map((item) => (
                  <li
                    key={item.file_url}
                  className="flex items-center justify-between gap-3 rounded-lg border border-ifma-border-light bg-admin-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="truncate text-caisbe-text">{item.filename}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(item.file_url)}
                      className="shrink-0 text-xs font-semibold uppercase tracking-wide text-caisbe-red hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <Button
          disabled={sending || uploading}
          onClick={() => void sendNewsletter()}
          className="mt-6"
        >
          {sending
            ? "Sending…"
            : `Send to ${selectedCount} marked subscriber${selectedCount === 1 ? "" : "s"}`}
        </Button>
      </Card>

      <Card padding="none" className="overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Subscribers</h2>
          {subscribers.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={markAll}
                className="border border-ifma-border bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-green hover:text-caisbe-green"
              >
                Mark all
              </button>
              <button
                type="button"
                onClick={unmarkAll}
                disabled={selectedIds.length === 0}
                className="border border-ifma-border bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-green hover:text-caisbe-green disabled:opacity-50"
              >
                Unmark all
              </button>
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-12" />)}</div>
        ) : subscribers.length === 0 ? (
          <div className="p-4"><EmptyState title="No subscribers yet" description="Subscribers are added when visitors sign up on the website." /></div>
        ) : (
          <table className="min-w-[620px] w-full divide-y divide-ifma-border-light text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th className="px-6 py-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                    <input
                      type="checkbox"
                      checked={allMarked}
                      onChange={() => (allMarked ? unmarkAll() : markAll())}
                      className="size-4 rounded border-ifma-border text-caisbe-green focus:ring-caisbe-green"
                    />
                    Mark
                  </label>
                </th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Email</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {subscribers.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSubscriber(row.id)}
                      aria-label={`Mark ${row.email}`}
                      className="size-4 rounded border-ifma-border text-caisbe-green focus:ring-caisbe-green"
                    />
                  </td>
                  <td className="px-6 py-4 text-caisbe-text">{row.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-caisbe-muted">
                    {new Date(row.subscribed_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {campaigns.length > 0 ? (
        <Card padding="none" className="overflow-x-auto">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Recent campaigns</h2>
          </div>
          <table className="min-w-[620px] w-full divide-y divide-ifma-border-light text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Subject</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Recipients</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {campaigns.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 font-medium text-caisbe-text">{row.subject}</td>
                  <td className="px-6 py-4 tabular-nums text-caisbe-muted">{row.recipient_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-caisbe-muted">
                    {new Date(row.sent_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
