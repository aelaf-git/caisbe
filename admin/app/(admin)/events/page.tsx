"use client";

import { useCallback, useEffect, useState } from "react";
import CpdActivitiesManager from "@/components/events/CpdActivitiesManager";
import EventsManager from "@/components/events/EventsManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import {
  apiFetch,
  ApiError,
  type CpdActivity,
  type IndustryEvent,
} from "@/lib/auth";

type Tab = "events" | "cpd";

export default function EventsAdminPage() {
  const [tab, setTab] = useState<Tab>("events");
  const [events, setEvents] = useState<IndustryEvent[]>([]);
  const [activities, setActivities] = useState<CpdActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventData, cpdData] = await Promise.all([
        apiFetch<IndustryEvent[]>("/admin/events"),
        apiFetch<CpdActivity[]>("/admin/cpd-activities"),
      ]);
      setEvents(eventData);
      setActivities(cpdData);
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
        title="Events & CPD"
        description="Add facility management events and exhibitions to the public calendar, upload industry reports, and maintain CPD activity hours for Professional Development."
      />

      <Tabs
        items={[
          { id: "events", label: "Event calendar", count: events.length },
          { id: "cpd", label: "CPD activities", count: activities.length },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Events and CPD sections"
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      {tab === "events" ? (
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
      ) : (
        <CpdActivitiesManager
          activities={activities}
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
      )}
      {dialog}
    </div>
  );
}
