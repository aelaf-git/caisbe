"use client";

import ForumModeration from "@/components/forum/ForumModeration";
import PageHeader from "@/components/ui/PageHeader";

export default function AdminForumPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network"
        title="Discussion forum"
        description="Moderate student discussions. Pin, lock, hide, or restore a thread or reply, and post announcements."
      />
      <ForumModeration />
    </div>
  );
}
