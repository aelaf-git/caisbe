"use client";

import { useCallback, useEffect, useState } from "react";
import NotificationsManager from "@/components/notifications/NotificationsManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError, type NotificationBroadcast } from "@/lib/auth";

export default function AdminNotificationsPage() {
  const [broadcasts, setBroadcasts] = useState<NotificationBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notice, dialog: noticeDialog } = useNoticeDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBroadcasts(await apiFetch<NotificationBroadcast[]>("/admin/notifications/broadcasts"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load notification broadcasts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publishing"
        title="Member notifications"
        description="Send announcements, holiday messages, and other updates to all registered members in the student portal. Email newsletters stay under Media library."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <NotificationsManager
        broadcasts={broadcasts}
        loading={loading}
        onRefresh={load}
        onError={(message) => {
          void notice({ tone: "error", title: "Something went wrong", description: message });
        }}
        onSuccess={(message) => {
          void notice({ tone: "success", title: "Sent", description: message });
        }}
      />
      {noticeDialog}
    </div>
  );
}
