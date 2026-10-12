"use client";

import PageHeader from "@/components/ui/PageHeader";
import { portalName, studentGuideIntro, studentGuideSections } from "@/lib/studentGuide";

export default function StudentGuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={portalName}
        title="Student User Guide"
        description={studentGuideIntro}
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center rounded-full border-2 border-caisbe-red px-5 text-sm font-bold text-caisbe-red hover:bg-caisbe-red hover:text-white print:hidden"
          >
            Print guide
          </button>
        }
      />

      <ol className="space-y-4">
        {studentGuideSections.map((section, index) => (
          <li
            key={section.title}
            className="rounded-[20px] border border-ifma-border bg-admin-surface p-5 shadow-hopewell sm:p-6"
          >
            <h2 className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
              {index + 1}. {section.title}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-6 text-caisbe-text">
                {paragraph}
              </p>
            ))}
            {section.items?.length ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-caisbe-muted">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
