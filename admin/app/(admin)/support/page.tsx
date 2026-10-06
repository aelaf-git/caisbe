"use client";

import SupportInbox from "@/components/support/SupportInbox";
import PageHeader from "@/components/ui/PageHeader";

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Student tickets"
        description="Review and reply to student IT and support tickets. Students open tickets from the portal Tickets page."
      />
      <SupportInbox />
    </div>
  );
}
