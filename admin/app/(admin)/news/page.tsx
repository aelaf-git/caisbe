"use client";

import { useCallback, useEffect, useState } from "react";
import NewsManager from "@/components/news/NewsManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError, type NewsPost } from "@/lib/auth";

export default function NewsAdminPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { notice, dialog: noticeDialog } = useNoticeDialog();

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

      <NewsManager
        posts={posts}
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
