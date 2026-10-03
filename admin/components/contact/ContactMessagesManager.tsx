"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, ApiError, type ContactMessage } from "@/lib/auth";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

const STATUS_TONES: Record<string, "neutral" | "success" | "warning" | "brand" | "info"> = {
  new: "brand",
  read: "warning",
  replied: "success",
  archived: "neutral",
};

export default function ContactMessagesManager({
  items,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  items: ContactMessage[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [replySubject, setReplySubject] = useState("Re: Your message to CAISBE");
  const [replyBody, setReplyBody] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const selected = filtered.find((item) => item.id === selectedId) ?? items.find((item) => item.id === selectedId) ?? null;

  async function markStatus(item: ContactMessage, status: string) {
    try {
      await apiFetch(`/admin/contact-messages/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onSuccess(`Marked as ${status}.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update status.");
    }
  }

  async function openMessage(item: ContactMessage) {
    setSelectedId(item.id);
    setReplySubject("Re: Your message to CAISBE");
    setReplyBody("");
    if (item.status === "new") {
      try {
        await apiFetch(`/admin/contact-messages/${item.id}`);
        await onRefresh();
      } catch {
        // listing still works even if mark-read fails
      }
    }
  }

  async function sendReply() {
    if (!selected) return;
    if (!replyBody.trim()) {
      onError("Write a reply before sending.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/admin/contact-messages/${selected.id}/reply`, {
        method: "POST",
        body: JSON.stringify({
          subject: replySubject.trim() || "Re: Your message to CAISBE",
          body: replyBody.trim(),
        }),
      });
      onSuccess(`Reply sent to ${selected.email}.`);
      setReplyBody("");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to send reply.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMessage(item: ContactMessage) {
    const ok = await askConfirm({
      title: "Delete contact message?",
      description: `Remove the message from ${item.first_name} ${item.last_name}?`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/contact-messages/${item.id}`, { method: "DELETE" });
      if (selectedId === item.id) setSelectedId(null);
      onSuccess("Contact message deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete message.");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Skeleton className="h-80 rounded-[20px]" />
        <Skeleton className="h-80 rounded-[20px]" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title="No contact messages yet"
        description="When someone submits the Contact Us form, their message will show up here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["new", "New"],
          ["read", "Read"],
          ["replied", "Replied"],
          ["archived", "Archived"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              statusFilter === id
                ? "bg-caisbe-red text-white"
                : "bg-admin-surface-muted text-caisbe-muted hover:text-caisbe-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-ifma-border-light">
            {filtered.map((item) => {
              const active = selected?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openMessage(item)}
                    className={`w-full px-5 py-4 text-left transition-colors ${
                      active ? "bg-caisbe-red/5" : "hover:bg-admin-surface-muted/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-caisbe-text-dark">
                          {item.first_name} {item.last_name}
                        </p>
                        <p className="mt-0.5 text-sm text-caisbe-muted">{item.email}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-caisbe-text">
                          {item.help_topic || item.comments}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONES[item.status] ?? "neutral"}>{item.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-caisbe-muted">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
          {!filtered.length ? (
            <div className="px-5 py-10 text-center text-sm text-caisbe-muted">
              No messages in this filter.
            </div>
          ) : null}
        </Card>

        {selected ? (
          <Card className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-hopewell-display text-xl font-extrabold text-caisbe-text-dark">
                  {selected.first_name} {selected.last_name}
                </h2>
                <p className="mt-1 text-sm text-caisbe-muted">
                  {selected.email}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </p>
              </div>
              <Badge tone={STATUS_TONES[selected.status] ?? "neutral"}>{selected.status}</Badge>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-caisbe-muted">Company</dt>
                <dd className="font-medium text-caisbe-text">{selected.company || "—"}</dd>
              </div>
              <div>
                <dt className="text-caisbe-muted">Job title</dt>
                <dd className="font-medium text-caisbe-text">{selected.job_title || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-caisbe-muted">How can we help?</dt>
                <dd className="font-medium text-caisbe-text">{selected.help_topic || "—"}</dd>
              </div>
            </dl>

            <div>
              <p className="text-sm font-semibold text-caisbe-text-dark">Comments</p>
              <p className="mt-2 whitespace-pre-wrap rounded-[16px] bg-admin-surface-muted px-4 py-3 text-sm leading-6 text-caisbe-text">
                {selected.comments}
              </p>
            </div>

            {selected.admin_reply ? (
              <div>
                <p className="text-sm font-semibold text-caisbe-text-dark">Previous reply</p>
                <p className="mt-2 whitespace-pre-wrap rounded-[16px] border border-caisbe-red/15 bg-caisbe-red/5 px-4 py-3 text-sm leading-6 text-caisbe-text">
                  {selected.admin_reply}
                </p>
                {selected.replied_at ? (
                  <p className="mt-1 text-xs text-caisbe-muted">
                    Sent {new Date(selected.replied_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-3 border-t border-ifma-border-light pt-5">
              <h3 className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">Reply</h3>
              <FormField label="Subject">
                <input
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className={fieldClassName}
                />
              </FormField>
              <FormField label="Message">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={6}
                  className={textAreaClassName}
                  placeholder="Write your reply…"
                />
              </FormField>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void sendReply()} disabled={saving}>
                  {saving ? "Sending…" : "Send reply"}
                </Button>
                {selected.status !== "archived" ? (
                  <Button variant="secondary" onClick={() => void markStatus(selected, "archived")}>
                    Archive
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => void markStatus(selected, "read")}>
                    Unarchive
                  </Button>
                )}
                <Button variant="ghost" onClick={() => void deleteMessage(selected)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="Select a message"
            description="Choose a contact submission from the list to read it and reply."
          />
        )}
      </div>
    </div>
  );
}
