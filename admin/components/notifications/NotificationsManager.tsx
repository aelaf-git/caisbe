"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, ApiError, type NotificationBroadcast } from "@/lib/auth";

const KINDS = [
  { id: "announcement", label: "Announcement" },
  { id: "message", label: "Message" },
  { id: "holiday", label: "Holiday" },
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
            link: "/notifications",
            audience: "all_students",
          }),
        },
      );
      setTitle("");
      setBody("");
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Compose</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          In-app notice for every registered member. Newsletters stay in Media library.
        </p>
        <form onSubmit={(e) => void handleSend(e)} className="mt-5 space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-caisbe-text">Type</p>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((option) => {
                const selected = kind === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setKind(option.id)}
                    className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                      selected
                        ? "border-caisbe-red bg-caisbe-red text-white"
                        : "border-ifma-border bg-admin-surface-muted text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
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
              className={`${textAreaClassName} min-h-36`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              required
              placeholder="Write what members should see in their portal notifications."
            />
          </FormField>
          <Button type="submit" disabled={sending} className="w-full sm:w-auto">
            {sending ? "Sending…" : "Send notification"}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Recent broadcasts</h2>
            <p className="mt-1 text-sm text-caisbe-muted">Newest first · up to 100</p>
          </div>
          {!loading && broadcasts.length > 0 ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              {broadcasts.length} sent
            </p>
          ) : null}
        </div>
        {loading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No broadcasts yet"
              description="Send an announcement, holiday note, or general message to all registered members."
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-ifma-border-light overflow-hidden rounded-[16px] border border-ifma-border-light">
            {broadcasts.map((row) => (
              <li key={row.id} className="bg-admin-surface-muted/40 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-caisbe-text-dark">{row.title}</p>
                  <span className="rounded-full bg-caisbe-red px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
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
