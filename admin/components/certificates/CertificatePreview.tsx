"use client";

import CertificateDocument from "@/components/certificates/CertificateDocument";
import MembershipCertificateDocument from "@/components/certificates/MembershipCertificateDocument";

const SAMPLE_STUDENT = "Jane Doe";
const SAMPLE_COMPLETION_CODE = "CAISBE-SAMPLE-A1B2C3D4";
const SAMPLE_MEMBERSHIP_CODE = "CAISBE-MEM-SAMPLE01";
const SAMPLE_MEMBERSHIP_NUMBER = "CAISBE-M-000001";

function portalBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002").replace(/\/$/, "");
}

export type CertificatePreviewProps = {
  courseTitle?: string;
  className?: string;
  kind?: "completion" | "membership" | "both";
};

export default function CertificatePreview({
  courseTitle = "Master Executive Leadership",
  className = "",
  kind = "both",
}: CertificatePreviewProps) {
  const issuedAt = new Date().toISOString();
  const completionVerify = `${portalBaseUrl()}/certificates/verify/${SAMPLE_COMPLETION_CODE}`;
  const membershipVerify = `${portalBaseUrl()}/certificates/verify/${SAMPLE_MEMBERSHIP_CODE}`;

  return (
    <div className={`space-y-8 ${className}`}>
      {kind === "completion" || kind === "both" ? (
        <div className="space-y-3">
          {kind === "both" ? (
            <h3 className="text-sm font-semibold uppercase tracking-wide text-caisbe-muted">
              Course completion
            </h3>
          ) : null}
          <CertificateDocument
            studentName={SAMPLE_STUDENT}
            courseTitle={courseTitle}
            issuedAt={issuedAt}
            verifyUrl={completionVerify}
            certificateCode={SAMPLE_COMPLETION_CODE}
          />
        </div>
      ) : null}
      {kind === "membership" || kind === "both" ? (
        <div className="space-y-3">
          {kind === "both" ? (
            <h3 className="text-sm font-semibold uppercase tracking-wide text-caisbe-muted">
              Membership
            </h3>
          ) : null}
          <MembershipCertificateDocument
            studentName={SAMPLE_STUDENT}
            membershipNumber={SAMPLE_MEMBERSHIP_NUMBER}
            issuedAt={issuedAt}
            verifyUrl={membershipVerify}
            certificateCode={SAMPLE_MEMBERSHIP_CODE}
          />
        </div>
      ) : null}
    </div>
  );
}
