"use client";

import Link from "next/link";
import PrintableMembershipApplication from "@/components/membership/PrintableMembershipApplication";

export default function MembershipApplicationFormPage() {
  return (
    <main className="bg-[#f8fafc] px-4 py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/membership/join" className="text-sm font-semibold text-caisbe-red">
            Back to membership
          </Link>
          <div className="flex flex-wrap gap-3">
            <a
              href="/forms/caisbe-membership-registration.docx"
              download="CAISBE-Membership-Registration.docx"
              className="rounded-full bg-caisbe-red px-4 py-2 text-sm font-semibold text-white"
            >
              Download Word form
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border-2 border-caisbe-red bg-white px-4 py-2 text-sm font-semibold text-caisbe-red"
            >
              Print / Save PDF
            </button>
          </div>
        </div>
        <PrintableMembershipApplication kind="application" />
      </div>
    </main>
  );
}
