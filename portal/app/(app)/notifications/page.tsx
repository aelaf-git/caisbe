"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  kind: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationList = {
  unread_count: number;
  items: NotificationItem[];
};

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    try {
      await apiFetch(`/me/notifications/${id}/read`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update notification.");
    } finally {
      setBusy(false);
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
        description="Updates about your courses, membership, and account."
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

      <section className="rounded-[20px] bg-white shadow-hopewell">
        {!data ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading notifications…</p>
        ) : data.items.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">You have no notifications yet.</p>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {data.items.map((item) => {
              const unread = !item.read_at;
              return (
                <li
                  key={item.id}
                  className={`px-5 py-4 md:px-6 ${unread ? "bg-caisbe-red/[0.03]" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                        {new Date(item.created_at).toLocaleString()}
                        {unread ? (
                          <span className="ml-2 rounded-full bg-caisbe-red px-2 py-0.5 text-[10px] font-bold text-white">
                            New
                          </span>
                        ) : null}
                      </p>
                      <h2 className="mt-1 font-display text-lg font-semibold text-caisbe-text-dark">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-caisbe-muted">{item.body}</p>
                      {item.link ? (
                        <Link
                          href={item.link}
                          className="mt-3 inline-flex text-sm font-semibold text-caisbe-red hover:underline"
                        >
                          Open related page
                        </Link>
                      ) : null}
                    </div>
                    {unread ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void markRead(item.id)}
                        className="shrink-0 text-sm font-semibold text-caisbe-red hover:underline disabled:opacity-60"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
