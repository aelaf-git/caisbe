"use client";

import { useCallback, useEffect, useState } from "react";
import ContactMessagesManager from "@/components/contact/ContactMessagesManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError, type ContactMessage } from "@/lib/auth";

export default function ContactMessagesAdminPage() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { notice, dialog: noticeDialog } = useNoticeDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiFetch<ContactMessage[]>("/admin/contact-messages"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load contact messages.");
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
        title="Contact messages"
        description="Review Contact Us submissions and reply by email."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <ContactMessagesManager
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
