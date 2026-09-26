"use client";

import Link from "next/link";
import { siteFullName, siteName } from "@/lib/data/home";

const fields = [
  "Full name",
  "Email",
  "Phone",
  "Country",
  "City",
  "Address",
  "Organization",
  "Job title",
  "Membership type (Student / Professional / Corporate / Senior-Fellow / Institutional)",
  "Signature",
  "Date",
];

export default function MembershipApplicationFormPage() {
  return (
    <main className="bg-white px-4 py-10 print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/membership/become-a-member" className="text-sm font-semibold text-caisbe-red">
            Back to membership
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-4 py-2 text-sm font-semibold uppercase text-white"
          >
            Print / Save PDF
          </button>
        </div>

        <article className="border border-ifma-border bg-white p-8 shadow-brand-card print:border-0 print:p-0 print:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-caisbe-red">{siteName}</p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-caisbe-text-dark">
            Membership Application Form
          </h1>
          <p className="mt-3 text-sm leading-6 text-caisbe-muted">
            {siteFullName}. Complete this form and upload it on the membership page, or fill the
            online registration form instead.
          </p>

          <div className="mt-8 space-y-5">
            {fields.map((field) => (
              <div key={field}>
                <p className="text-sm font-semibold text-caisbe-text-dark">{field}</p>
                <div className="mt-2 h-10 border-b border-ifma-border" />
              </div>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
