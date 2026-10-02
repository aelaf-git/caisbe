"use client";

import { useCallback, useEffect, useState } from "react";
import NewsManager from "@/components/news/NewsManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { apiFetch, ApiError, type NewsPost } from "@/lib/auth";

export default function NewsAdminPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await apiFetch<NewsPost[]>("/admin/news"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load news.");
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
        title="News & Announcements"
        description="Post institute news with a cover image, gallery images, videos, and short and long descriptions."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <NewsManager
        posts={posts}
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
