"use client";

import { useCallback, useEffect, useState } from "react";
import SeminarsManager from "@/components/seminars/SeminarsManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError, type Seminar } from "@/lib/auth";

export default function SeminarsAdminPage() {
  const [items, setItems] = useState<Seminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { notice, dialog: noticeDialog } = useNoticeDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiFetch<Seminar[]>("/admin/seminars"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load seminars.");
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
        eyebrow="Learning"
        title="Seminars"
        description="Add or remove the seminars shown under certificate programs."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <SeminarsManager
        items={items}
        loading={loading}
        onRefresh={load}
        onError={(message) => {
          void notice({ tone: "error", title: "Something went wrong", description: message });
        }}
        onSuccess={(message) => {
          void notice({ tone: "success", title: "Done", description: message });
        }}
        askConfirm={confirm}
      />
      {confirmDialog}
      {noticeDialog}
    </div>
  );
}
