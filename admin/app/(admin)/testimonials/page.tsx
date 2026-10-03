"use client";

import { useCallback, useEffect, useState } from "react";
import TestimonialsManager from "@/components/testimonials/TestimonialsManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { apiFetch, ApiError, type Testimonial } from "@/lib/auth";

export default function TestimonialsAdminPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiFetch<Testimonial[]>("/admin/testimonials"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load testimonials.");
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
        title="Testimonials"
        description="Add and edit the quotes shown on the homepage."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <TestimonialsManager
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
