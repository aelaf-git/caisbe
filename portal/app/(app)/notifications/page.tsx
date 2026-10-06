"use client";

import { useCallback, useEffect, useState } from "react";
import NotificationDialog, {
  type NotificationDialogItem,
} from "@/components/ui/NotificationDialog";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";

type NotificationItem = NotificationDialogItem & {
  read_at: string | null;
};

type NotificationList = {
  unread_count: number;
  items: NotificationItem[];
};

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await apiFetch<NotificationList>("/me/notifications"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load notifications.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: number) {
    try {
      await apiFetch(`/me/notifications/${id}/read`, { method: "POST" });
      setData((current) => {
        if (!current) return current;
        const items = current.items.map((row) =>
          row.id === id ? { ...row, read_at: row.read_at ?? new Date().toISOString() } : row,
        );
        return {
          items,
          unread_count: items.filter((row) => !row.read_at).length,
        };
      });
      setSelected((current) =>
        current && current.id === id
          ? { ...current, read_at: current.read_at ?? new Date().toISOString() }
          : current,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update notification.");
    }
  }

  async function openNotification(item: NotificationItem) {
    setSelected(item);
    if (!item.read_at) {
      await markRead(item.id);
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await apiFetch("/me/notifications/read-all", { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description="Updates about your courses, membership, and account. Click a notification to open it."
        actions={
          data && data.unread_count > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void markAllRead()}
              className="inline-flex h-11 items-center rounded-full border-2 border-ifma-border px-5 text-sm font-bold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red disabled:opacity-60"
            >
              Mark all read
            </button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </div>
      ) : null}

      <section className="rounded-[20px] border border-ifma-border bg-admin-surface shadow-hopewell">
        {!data ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading notifications…</p>
        ) : data.items.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">You have no notifications yet.</p>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {data.items.map((item) => {
              const unread = !item.read_at;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(item)}
                    className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-admin-surface-muted/60 md:px-6 ${
                      unread ? "bg-caisbe-red/[0.04]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                        {new Date(item.created_at).toLocaleString()}
                        <span className="ml-2 rounded-full bg-admin-surface-muted px-2 py-0.5 text-[10px] font-bold text-caisbe-text">
                          {item.kind.replaceAll("_", " ")}
                        </span>
                        {unread ? (
                          <span className="ml-2 rounded-full bg-caisbe-red px-2 py-0.5 text-[10px] font-bold text-white">
                            New
                          </span>
                        ) : null}
                      </p>
                      <h2 className="mt-1 font-display text-lg font-semibold text-caisbe-text-dark">
                        {item.title}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-caisbe-muted">{item.body}</p>
                    </div>
                    <span className="shrink-0 pt-1 text-sm font-semibold text-caisbe-red">View</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <NotificationDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
