"use client";

import { useCallback, useEffect, useState } from "react";
import MagazineManager from "@/components/media/MagazineManager";
import NewsletterPanel from "@/components/media/NewsletterPanel";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import {
  apiFetch,
  ApiError,
  type MediaAsset,
  type NewsletterCampaign,
  type NewsletterSubscriber,
} from "@/lib/auth";

type Tab = "magazines" | "newsletter";

export default function MediaPage() {
  const [tab, setTab] = useState<Tab>("magazines");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mediaData, subscriberData, campaignData] = await Promise.all([
        apiFetch<MediaAsset[]>("/admin/media?category=magazine"),
        apiFetch<NewsletterSubscriber[]>("/admin/newsletter/subscribers"),
        apiFetch<NewsletterCampaign[]>("/admin/newsletter/campaigns"),
      ]);
      setAssets(mediaData);
      setSubscribers(subscriberData);
      setCampaigns(campaignData);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load media library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data synchronization; subsequent refreshes reuse the same callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Media library"
        description="Manage CAISBE magazine issues for the website and send newsletters to subscribers."
      />

      <Tabs
        items={[
          { id: "magazines", label: "Magazines", count: assets.length },
          { id: "newsletter", label: "Newsletter", count: subscribers.length },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Media sections"
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      {tab === "magazines" ? (
        <MagazineManager
          assets={assets}
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
        <NewsletterPanel
          subscribers={subscribers}
          campaigns={campaigns}
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
        />
      )}
      {dialog}
    </div>
  );
}
