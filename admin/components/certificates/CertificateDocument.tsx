"use client";

import { QRCodeSVG } from "qrcode.react";
import { cssPx } from "@/lib/cssLength";
import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
} from "@/components/certificates/MembershipCertificateDocument";

export type CertificateDocumentProps = {
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  verifyUrl: string;
  certificateCode?: string;
  issuedBy?: string;
};

function formatIssueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" });
}

function CornerTopLeft() {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={198}
      height={178}
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
      className="pointer-events-none absolute bottom-0 right-0"
      width={126}
      height={127}
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
  issuedBy = "CAISBE",
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
                width: ${cssPx(CERTIFICATE_WIDTH_PX)}px !important;
                height: ${cssPx(CERTIFICATE_HEIGHT_PX)}px !important;
              }
            }
          `,
        }}
      />

      <article
        className="certificate-document relative mx-auto overflow-hidden bg-white shadow-brand-card print:shadow-none"
        style={{
          width: CERTIFICATE_WIDTH_PX,
          height: CERTIFICATE_HEIGHT_PX,
          minWidth: CERTIFICATE_WIDTH_PX,
          minHeight: CERTIFICATE_HEIGHT_PX,
        }}
      >
        <div className="absolute inset-[12px] border-2 border-[#c9a227]" />
        <CornerTopLeft />
        <CornerBottomRight />

        <div
          className="relative flex h-full flex-col text-center"
          style={{ padding: "44px 72px 36px" }}
        >
          <header className="shrink-0">
            <img
              src="/images/logo.png"
              alt="CAISBE"
              width={2172}
              height={724}
              className="mx-auto mb-2 object-contain"
              style={{ height: 44, width: "auto" }}
            />
            <h1
              className="font-[family-name:var(--font-cinzel)] font-bold uppercase text-[#c9a227]"
              style={{ fontSize: 44, letterSpacing: "0.08em", lineHeight: 1.1 }}
            >
              Certificate
            </h1>
            <p
              className="mt-1 font-[family-name:var(--font-cinzel)] font-normal uppercase text-[#7b1e3a]"
              style={{ fontSize: 16, letterSpacing: "0.35em", lineHeight: 1.2 }}
            >
              Of Completion
            </p>
          </header>

          <div className="shrink-0" style={{ marginTop: 28 }}>
            <p className="text-[#5c5348]" style={{ fontSize: 14, lineHeight: 1.4 }}>
              This certificate is proudly presented to
            </p>
            <p
              className="mx-auto font-[family-name:var(--font-great-vibes)] leading-tight text-[#7b1e3a]"
              style={{ marginTop: 8, maxWidth: 640, fontSize: 52 }}
            >
              {studentName}
            </p>
            <div className="mx-auto bg-[#7b1e3a]" style={{ marginTop: 8, height: 1, width: 280 }} />
            <p
              className="mx-auto font-[family-name:var(--font-cinzel)] font-semibold text-[#7b1e3a]"
              style={{ marginTop: 16, maxWidth: 620, fontSize: 20, lineHeight: 1.3 }}
            >
              {courseTitle}
            </p>
          </div>

          <p
            className="mx-auto shrink-0 text-balance leading-relaxed text-[#5c5348]"
            style={{ marginTop: 24, maxWidth: 620, fontSize: 14 }}
          >
            in recognition of your dedication and successful completion of{" "}
            <span className="font-semibold text-[#3d3832]">{courseTitle}</span>, issued on{" "}
            <span className="font-semibold text-[#3d3832]">{issuedLabel}</span>.
          </p>

          <footer
            className="relative z-10 mt-auto grid shrink-0 items-end"
            style={{
              gridTemplateColumns: "1fr 120px 1fr",
              columnGap: 24,
              paddingTop: 20,
              paddingBottom: 4,
            }}
          >
            <div className="col-start-1 row-start-1 justify-self-center px-2 text-center">
              <p className="mb-1 font-medium text-[#3d3832]" style={{ fontSize: 14 }}>
                {issuedLabel}
              </p>
              <div className="mx-auto bg-[#c9a227]" style={{ height: 1, width: 112 }} />
              <p
                className="mt-1.5 font-bold uppercase tracking-wide text-[#7b1e3a]"
                style={{ fontSize: 12 }}
              >
                Issue Date
              </p>
            </div>

            <div className="col-start-2 row-start-1 justify-self-center">
              <div className="rounded-sm bg-white p-1 print:p-0">
                <QRCodeSVG value={verifyUrl} size={96} level="M" includeMargin={false} />
              </div>
            </div>

            <div className="col-start-3 row-start-1 justify-self-center px-2 text-center">
              <p className="mb-1 font-medium text-[#3d3832]" style={{ fontSize: 14 }}>
                {issuedBy}
              </p>
              <div className="mx-auto bg-[#c9a227]" style={{ height: 1, width: 112 }} />
              <p
                className="mt-1.5 font-bold uppercase tracking-wide text-[#7b1e3a]"
                style={{ fontSize: 12 }}
              >
                Issued By
              </p>
            </div>

            {certificateCode ? (
              <p
                className="col-start-2 row-start-2 mt-1 w-full break-all text-center font-mono leading-tight text-[#5c5348]"
                style={{ fontSize: 8 }}
              >
                {certificateCode}
              </p>
            ) : null}
          </footer>
        </div>
      </article>
    </>
  );
}
