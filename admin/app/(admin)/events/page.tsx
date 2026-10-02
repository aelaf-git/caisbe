"use client";

import { useCallback, useEffect, useState } from "react";
import EventsManager from "@/components/events/EventsManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { apiFetch, ApiError, type IndustryEvent } from "@/lib/auth";

export default function EventsAdminPage() {
  const [events, setEvents] = useState<IndustryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const eventData = await apiFetch<IndustryEvent[]>("/admin/events");
      setEvents(eventData);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load events.");
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
        title="Events"
        description="Add facility management events and exhibitions to the public calendar, and upload industry reports."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <EventsManager
        events={events}
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
