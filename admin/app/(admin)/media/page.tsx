"use client";

import { useCallback, useEffect, useState } from "react";
import HeroManager from "@/components/media/HeroManager";
import MagazineManager from "@/components/media/MagazineManager";
import NewsletterPanel from "@/components/media/NewsletterPanel";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import {
  apiFetch,
  ApiError,
  type MediaAsset,
  type NewsletterCampaign,
  type NewsletterSubscriber,
} from "@/lib/auth";

type Tab = "hero" | "magazines" | "newsletter";

export default function MediaPage() {
  const [tab, setTab] = useState<Tab>("hero");
  const [heroAssets, setHeroAssets] = useState<MediaAsset[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { notice, dialog: noticeDialog } = useNoticeDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [heroData, mediaData, subscriberData, campaignData] = await Promise.all([
        apiFetch<MediaAsset[]>("/admin/media?category=hero"),
        apiFetch<MediaAsset[]>("/admin/media?category=magazine"),
        apiFetch<NewsletterSubscriber[]>("/admin/newsletter/subscribers"),
        apiFetch<NewsletterCampaign[]>("/admin/newsletter/campaigns"),
      ]);
      setHeroAssets(heroData);
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

  const showSuccess = useCallback(
    (message: string) => {
      void notice({ tone: "success", title: "Done", description: message });
    },
    [notice],
  );

  const showActionError = useCallback(
    (message: string) => {
      void notice({ tone: "error", title: "Something went wrong", description: message });
    },
    [notice],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Media library"
        description="Manage the homepage hero carousel, magazine issues, and newsletters."
      />

      <Tabs
        items={[
          { id: "hero", label: "Hero", count: heroAssets.length },
          { id: "magazines", label: "Magazines", count: assets.length },
          { id: "newsletter", label: "Newsletter", count: subscribers.length },
        ]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setError(null);
        }}
        ariaLabel="Media sections"
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {tab === "hero" ? (
        <HeroManager
          assets={heroAssets}
          loading={loading}
          onRefresh={load}
          onError={showActionError}
          onSuccess={showSuccess}
          askConfirm={confirm}
        />
      ) : tab === "magazines" ? (
        <MagazineManager
          assets={assets}
          loading={loading}
          onRefresh={load}
          onError={showActionError}
          onSuccess={showSuccess}
          askConfirm={confirm}
        />
      ) : (
        <NewsletterPanel
          subscribers={subscribers}
          campaigns={campaigns}
          loading={loading}
          onRefresh={load}
          onError={showActionError}
          onSuccess={showSuccess}
        />
      )}
      {confirmDialog}
      {noticeDialog}
    </div>
  );
}
