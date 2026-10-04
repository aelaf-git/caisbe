"use client";

import { useEffect, useMemo, useState } from "react";
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

const FILTERS = [
  ["all", "All"],
  ["new", "New"],
  ["read", "Read"],
  ["replied", "Replied"],
  ["archived", "Archived"],
] as const;

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75v-9a.75.75 0 0 1 .75-.75Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 7.5 8 5.5 8-5.5" />
  </svg>
);

function formatCompactDate(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs >= 0 && diffMs < dayMs) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diffMs >= 0 && diffMs < 7 * dayMs) {
    return date.toLocaleDateString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function pickDefaultMessage(list: ContactMessage[]) {
  return list.find((item) => item.status === "new") ?? list[0] ?? null;
}

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
  onError: (message: string) => void | Promise<void>;
  onSuccess: (message: string) => void | Promise<void>;
  askConfirm: AskConfirm;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [replySubject, setReplySubject] = useState("Re: Your message to CAISBE");
  const [replyBody, setReplyBody] = useState("");
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const next = { all: items.length, new: 0, read: 0, replied: 0, archived: 0 };
    for (const item of items) {
      if (item.status in next) {
        next[item.status as keyof typeof next] += 1;
      }
    }
    return next;
  }, [items]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  async function markStatus(item: ContactMessage, status: string) {
    try {
      await apiFetch(`/admin/contact-messages/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await onSuccess(`Marked as ${status}.`);
      await onRefresh();
    } catch (err) {
      await onError(err instanceof ApiError ? err.detail : "Unable to update status.");
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

  useEffect(() => {
    if (!filtered.length) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const stillVisible = filtered.some((item) => item.id === selectedId);
    if (stillVisible) return;
    const next = pickDefaultMessage(filtered);
    if (!next) return;
    setSelectedId(next.id);
    setReplySubject("Re: Your message to CAISBE");
    setReplyBody("");
  }, [filtered, selectedId]);

  async function sendReply() {
    if (!selected) return;
    if (!replyBody.trim()) {
      await onError("Write a reply before sending.");
      return;
    }
    setSaving(true);
    try {
      const recipient = selected.email;
      await apiFetch(`/admin/contact-messages/${selected.id}/reply`, {
        method: "POST",
        body: JSON.stringify({
          subject: replySubject.trim() || "Re: Your message to CAISBE",
          body: replyBody.trim(),
        }),
      });
      setReplyBody("");
      await onSuccess(`Reply sent to ${recipient}.`);
      await onRefresh();
    } catch (err) {
      await onError(err instanceof ApiError ? err.detail : "Unable to send reply.");
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
      await onSuccess("Contact message deleted.");
      await onRefresh();
    } catch (err) {
      await onError(err instanceof ApiError ? err.detail : "Unable to delete message.");
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
        icon={MAIL_ICON}
        title="No contact messages yet"
        description="When someone submits the Contact Us form, their message will show up here."
      />
    );
  }

  const canSend = Boolean(replyBody.trim()) && !saving;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([id, label]) => {
          const count = counts[id];
          const active = statusFilter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                active
                  ? "bg-caisbe-red text-white"
                  : "bg-admin-surface-muted text-caisbe-muted hover:text-caisbe-text"
              }`}
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active ? "bg-white/20 text-white" : "bg-white text-caisbe-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ifma-border-light px-5 py-3">
            <h2 className="text-sm font-semibold text-caisbe-text-dark">Inbox</h2>
            <p className="text-xs text-caisbe-muted tabular-nums">
              {filtered.length} message{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          {filtered.length ? (
            <ul className="divide-y divide-ifma-border-light">
              {filtered.map((item) => {
                const active = selected?.id === item.id;
                const isNew = item.status === "new";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openMessage(item)}
                      className={`relative w-full px-5 py-4 text-left transition-colors ${
                        active
                          ? "bg-caisbe-red/5"
                          : isNew
                            ? "bg-admin-surface hover:bg-admin-surface-muted/70"
                            : "hover:bg-admin-surface-muted/70"
                      }`}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-1 bg-caisbe-red"
                        />
                      ) : null}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`truncate text-caisbe-text-dark ${
                              isNew ? "font-bold" : "font-semibold"
                            }`}
                          >
                            {item.first_name} {item.last_name}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-caisbe-muted">{item.email}</p>
                          {item.help_topic ? (
                            <p className="mt-2 truncate text-xs font-medium uppercase tracking-wide text-caisbe-muted">
                              {item.help_topic}
                            </p>
                          ) : null}
                          <p className="mt-1 line-clamp-1 text-sm text-caisbe-text">{item.comments}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge tone={STATUS_TONES[item.status] ?? "neutral"}>{item.status}</Badge>
                          <p className="text-xs text-caisbe-muted tabular-nums">
                            {formatCompactDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-caisbe-muted">
              No messages in this filter.
            </div>
          )}
        </Card>

        {selected ? (
          <Card padding="none" className="overflow-hidden">
            <div className="space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-hopewell-display text-xl font-extrabold text-caisbe-text-dark">
                    {selected.first_name} {selected.last_name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-caisbe-muted">
                    <a
                      href={`mailto:${selected.email}`}
                      className="font-medium text-caisbe-text-dark underline-offset-2 hover:text-caisbe-red hover:underline"
                    >
                      {selected.email}
                    </a>
                    {selected.phone ? (
                      <a
                        href={`tel:${selected.phone}`}
                        className="hover:text-caisbe-text-dark"
                      >
                        {selected.phone}
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-caisbe-muted">
                    Received {new Date(selected.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge tone={STATUS_TONES[selected.status] ?? "neutral"}>{selected.status}</Badge>
              </div>

              <dl className="grid gap-3 rounded-[16px] bg-admin-surface-muted/70 px-4 py-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-caisbe-muted">Company</dt>
                  <dd className="mt-0.5 font-medium text-caisbe-text">{selected.company || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-caisbe-muted">Job title</dt>
                  <dd className="mt-0.5 font-medium text-caisbe-text">{selected.job_title || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-caisbe-muted">How can we help?</dt>
                  <dd className="mt-0.5 font-medium text-caisbe-text">{selected.help_topic || "—"}</dd>
                </div>
              </dl>

              <div>
                <p className="text-sm font-semibold text-caisbe-text-dark">Message</p>
                <p className="mt-2 whitespace-pre-wrap rounded-[16px] border border-ifma-border-light bg-white px-4 py-3 text-sm leading-6 text-caisbe-text">
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
            </div>

            <div className="space-y-3 border-t border-ifma-border-light bg-admin-surface-muted/40 p-6">
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
                  rows={5}
                  className={textAreaClassName}
                  placeholder="Write your reply…"
                />
              </FormField>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => void sendReply()} disabled={!canSend}>
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
            icon={MAIL_ICON}
            title="Select a message"
            description="Choose a contact submission from the list to read it and reply."
          />
        )}
      </div>
    </div>
  );
}
