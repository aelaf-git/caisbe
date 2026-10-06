"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName } from "@/components/ui/FormField";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, ApiError, type NotificationBroadcast } from "@/lib/auth";

const KINDS = [
  { id: "announcement", label: "Important announcement" },
  { id: "message", label: "General message" },
  { id: "holiday", label: "Holiday message" },
] as const;

export default function NotificationsManager({
  broadcasts,
  loading,
  onRefresh,
  onError,
  onSuccess,
}: {
  broadcasts: NotificationBroadcast[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("announcement");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      onError("Title and message body are required.");
      return;
    }
    setSending(true);
    try {
      const result = await apiFetch<{ message: string; recipient_count: number }>(
        "/admin/notifications/send",
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            kind,
            link: link.trim() || null,
            audience: "all_students",
          }),
        },
      );
      setTitle("");
      setBody("");
      setLink("");
      setKind("announcement");
      await onRefresh();
      onSuccess(result.message || `Notification sent to ${result.recipient_count} member(s).`);
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to send notification.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
          Send to all registered members
        </h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          Delivers an in-app portal notification (separate from email newsletters).
        </p>
        <form onSubmit={(e) => void handleSend(e)} className="mt-4 space-y-4">
          <FormField label="Type">
            <select
              className={fieldClassName}
              value={kind}
              onChange={(e) => setKind(e.target.value as (typeof KINDS)[number]["id"])}
            >
              {KINDS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Title">
            <input
              className={fieldClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              required
              placeholder="Holiday closure notice"
            />
          </FormField>
          <FormField label="Message">
            <textarea
              className={`${fieldClassName} min-h-32 py-2.5`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              required
              placeholder="Write the announcement or message members should see in their portal notifications."
            />
          </FormField>
          <FormField label="Optional link" hint="Portal path such as /membership or /courses">
            <input
              className={fieldClassName}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              maxLength={255}
              placeholder="/membership"
            />
          </FormField>
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send notification"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Recent broadcasts</h2>
        <p className="mt-1 text-sm text-caisbe-muted">Last 100 in-app notifications sent to members.</p>
        {loading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No broadcasts yet"
              description="Send an announcement, holiday note, or general message to all registered members."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {broadcasts.map((row) => (
              <li key={row.id} className="border border-ifma-border-light px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-caisbe-text-dark">{row.title}</p>
                  <span className="rounded-full bg-caisbe-red/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-caisbe-red">
                    {row.kind.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-caisbe-muted">{row.body}</p>
                <p className="mt-2 text-xs text-caisbe-muted">
                  {row.recipient_count} member{row.recipient_count === 1 ? "" : "s"} ·{" "}
                  {new Date(row.created_at).toLocaleString()}
                  {row.sent_by_name ? ` · ${row.sent_by_name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
