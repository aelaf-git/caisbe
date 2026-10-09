"use client";

import Link from "next/link";
import HelpSupportCenter from "@/components/portal/HelpSupportCenter";
import PageHeader from "@/components/ui/PageHeader";
import { siteUrl } from "@/lib/membershipApplication";

export default function HelpSupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Help and Support"
        description="FAQs, technical tickets, and requests for courses, certificates, your account, and problems to report."
        actions={
          <Link
            href={siteUrl("/help")}
            className="inline-flex h-11 items-center rounded-full border-2 border-caisbe-red px-5 text-sm font-bold text-caisbe-red hover:bg-caisbe-red hover:text-white"
          >
            Open on the public site
          </Link>
        }
      />
      <HelpSupportCenter />
    </div>
  );
}
