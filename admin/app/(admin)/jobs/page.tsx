"use client";

import { useCallback, useEffect, useState } from "react";
import JobsManager from "@/components/jobs/JobsManager";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError, type JobPosting } from "@/lib/auth";

export default function JobsAdminPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { notice, dialog: noticeDialog } = useNoticeDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await apiFetch<JobPosting[]>("/admin/jobs"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load jobs.");
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
        title="Job board"
        description="Manually upload facility management jobs with post and expiry dates. Expired jobs leave the public board automatically."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <JobsManager
        jobs={jobs}
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
