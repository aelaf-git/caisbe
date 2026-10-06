"use client";

import SupportInbox from "@/components/support/SupportInbox";
import PageHeader from "@/components/ui/PageHeader";

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Student messages"
        description="Reply to student questions and issues in near real time. Students message from the portal Messages page."
      />
      <SupportInbox />
    </div>
  );
}
