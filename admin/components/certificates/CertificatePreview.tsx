"use client";

import CertificateDocument from "@/components/certificates/CertificateDocument";

const SAMPLE_STUDENT = "Jane Doe";
const SAMPLE_CODE = "CAISBE-SAMPLE-A1B2C3D4";

function portalBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002").replace(/\/$/, "");
}

export type CertificatePreviewProps = {
  courseTitle?: string;
  className?: string;
};

export default function CertificatePreview({
  courseTitle = "Master Executive Leadership",
  className = "",
}: CertificatePreviewProps) {
  const issuedAt = new Date().toISOString();
  const verifyUrl = `${portalBaseUrl()}/certificates/verify/${SAMPLE_CODE}`;

  return (
    <div className={className}>
      <CertificateDocument
        studentName={SAMPLE_STUDENT}
        courseTitle={courseTitle}
        issuedAt={issuedAt}
        verifyUrl={verifyUrl}
        certificateCode={SAMPLE_CODE}
      />
    </div>
  );
}
