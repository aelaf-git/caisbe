"use client";

import { useCallback, useEffect, useState } from "react";
import MagazineManager from "@/components/media/MagazineManager";
import NewsletterPanel from "@/components/media/NewsletterPanel";
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
    void load();
  }, [load]);

  function askConfirm(options: {
    title: string;
    description: string;
    confirmLabel?: string;
  }): Promise<boolean> {
    return Promise.resolve(
      window.confirm(`${options.title}\n\n${options.description}`),
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Media library</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          Manage CAISBE magazine issues for the website and send newsletters to subscribers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-ifma-border-light">
        {(
          [
            ["magazines", "Magazines"],
            ["newsletter", "Newsletter"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
              tab === id
                ? "border-caisbe-green text-caisbe-green"
                : "border-transparent text-caisbe-muted hover:text-caisbe-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {success ? (
        <p className="text-sm text-caisbe-green">{success}</p>
      ) : null}

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
          askConfirm={askConfirm}
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
    </div>
  );
}
