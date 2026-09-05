"use client";

import { Cinzel, Great_Vibes } from "next/font/google";
import { QRCodeSVG } from "qrcode.react";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-cinzel",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-great-vibes",
});

export type CertificateDocumentProps = {
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  verifyUrl: string;
  certificateCode?: string;
};

function formatIssueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" });
}

function CornerTopLeft() {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 h-[28%] w-[22%] min-h-[80px] min-w-[100px]"
      viewBox="0 0 200 160"
      fill="none"
      aria-hidden
    >
      <path d="M0 0 H200 V55 C120 55 55 95 0 160 Z" fill="#7b1e3a" />
      <path d="M0 0 H155 V42 C95 42 48 72 0 118 Z" fill="#c9a227" />
    </svg>
  );
}

function CornerBottomRight() {
  return (
    <svg
      className="pointer-events-none absolute bottom-0 right-0 h-[28%] w-[22%] min-h-[80px] min-w-[100px]"
      viewBox="0 0 200 160"
      fill="none"
      aria-hidden
    >
      <path d="M200 160 H0 V105 C80 105 145 65 200 0 Z" fill="#7b1e3a" />
      <path d="M200 160 H45 V118 C105 118 152 88 200 42 Z" fill="#c9a227" />
      <path d="M200 160 H90 V132 C130 132 160 112 200 78 Z" fill="#9a2848" />
    </svg>
  );
}

export default function CertificateDocument({
  studentName,
  courseTitle,
  issuedAt,
  verifyUrl,
  certificateCode,
}: CertificateDocumentProps) {
  const issuedLabel = formatIssueDate(issuedAt);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 landscape;
                margin: 12mm;
              }
              .certificate-document {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          `,
        }}
      />

      <article
        className={`certificate-document relative mx-auto aspect-[297/210] w-full max-w-[900px] overflow-hidden bg-white shadow-brand-card print:max-w-none print:shadow-none ${cinzel.variable} ${greatVibes.variable}`}
      >
        <div className="absolute inset-3 border-2 border-[#c9a227] print:inset-2" />
        <CornerTopLeft />
        <CornerBottomRight />

        <div className="relative flex h-full flex-col px-[8%] py-[7%] text-center">
          <header className="shrink-0 pt-[2%]">
            <h1 className="font-[family-name:var(--font-cinzel)] text-[clamp(1.75rem,4.5vw,2.75rem)] font-bold uppercase tracking-[0.08em] text-[#c9a227]">
              Certificate
            </h1>
            <p className="mt-1 font-[family-name:var(--font-cinzel)] text-[clamp(0.75rem,2vw,1rem)] font-normal uppercase tracking-[0.35em] text-[#7b1e3a]">
              Of Completion
            </p>
          </header>

          <div className="mt-[4%] shrink-0">
            <p className="text-[clamp(0.65rem,1.6vw,0.85rem)] text-[#5c5348]">
              This certificate is proudly presented to
            </p>
            <p className="mx-auto mt-2 max-w-[85%] font-[family-name:var(--font-great-vibes)] text-[clamp(2rem,6vw,3.25rem)] leading-tight text-[#7b1e3a]">
              {studentName}
            </p>
            <div className="mx-auto mt-2 h-px w-[min(55%,320px)] bg-[#7b1e3a]" />
          </div>

          <p className="mx-auto mt-[4%] max-w-[78%] shrink-0 text-[clamp(0.65rem,1.5vw,0.82rem)] leading-relaxed text-[#5c5348]">
            in recognition of your dedication and successful completion of{" "}
            <span className="font-semibold text-[#3d3832]">{courseTitle}</span>, issued on{" "}
            <span className="font-semibold text-[#3d3832]">{issuedLabel}</span>.
          </p>

          <footer className="mt-auto grid shrink-0 grid-cols-[1fr_auto_1fr] items-end gap-4 pb-[1%] pt-[5%]">
            <div className="text-center">
              <p className="mb-1 text-[clamp(0.7rem,1.4vw,0.85rem)] font-medium text-[#3d3832]">
                {issuedLabel}
              </p>
              <div className="mx-auto h-px w-[min(100%,120px)] bg-[#c9a227]" />
              <p className="mt-1.5 text-[clamp(0.6rem,1.2vw,0.75rem)] font-bold uppercase tracking-wide text-[#7b1e3a]">
                Issue Date
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="rounded-sm bg-white p-1 print:p-0">
                <QRCodeSVG value={verifyUrl} size={112} level="M" includeMargin={false} />
              </div>
              {certificateCode ? (
                <p className="mt-1 max-w-[140px] truncate font-mono text-[9px] text-[#5c5348] print:text-[8px]">
                  {certificateCode}
                </p>
              ) : null}
            </div>

            <div className="text-center">
              <p className="mb-1 text-[clamp(0.7rem,1.4vw,0.85rem)] font-medium text-[#3d3832]">CAISBE</p>
              <div className="mx-auto h-px w-[min(100%,120px)] bg-[#c9a227]" />
              <p className="mt-1.5 text-[clamp(0.6rem,1.2vw,0.75rem)] font-bold uppercase tracking-wide text-[#7b1e3a]">
                Issued By
              </p>
            </div>
          </footer>
        </div>
      </article>
    </>
  );
}
