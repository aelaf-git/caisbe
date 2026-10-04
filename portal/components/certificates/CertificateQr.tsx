"use client";

import { QRCodeSVG } from "qrcode.react";
import { isAbsoluteHttpUrl } from "@/lib/certificateVerifyUrl";

type CertificateQrProps = {
  verifyUrl: string;
  size?: number;
};

/** QR that only encodes absolute http(s) verify links (scan-safe). */
export default function CertificateQr({ verifyUrl, size = 96 }: CertificateQrProps) {
  const value = verifyUrl.trim();
  if (!isAbsoluteHttpUrl(value)) {
    return (
      <div
        className="certificate-qr flex items-center justify-center rounded-sm bg-white p-1 text-center print:p-0"
        style={{ width: size + 8, height: size + 8 }}
        aria-hidden
      >
        <span className="text-[10px] leading-tight text-[#7b1e3a]">Verify URL unavailable</span>
      </div>
    );
  }

  return (
    <div className="certificate-qr rounded-sm bg-white p-1 print:p-0">
      <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
    </div>
  );
}
