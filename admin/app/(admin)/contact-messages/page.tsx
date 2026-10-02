"use client";

import { useCallback, useEffect, useState } from "react";
import ContactMessagesManager from "@/components/contact/ContactMessagesManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { apiFetch, ApiError, type ContactMessage } from "@/lib/auth";

export default function ContactMessagesAdminPage() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

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
      {success ? <Alert tone="success">{success}</Alert> : null}

      <ContactMessagesManager
        items={items}
        loading={loading}
        onRefresh={load}
        onError={(message) => {
          setSuccess(null);
          setError(message);
        }}
        onSuccess={(message) => {
          setError(null);
          setSuccess(message);
        }}
        askConfirm={confirm}
      />
      {dialog}
    </div>
  );
}
