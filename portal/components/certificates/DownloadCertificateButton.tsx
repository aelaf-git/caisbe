"use client";

import { useState } from "react";
import { downloadCertificatePdf } from "@/lib/certificatePdf";

export default function DownloadCertificateButton({
  fileName,
  targetSelector = ".certificate-document",
}: {
  fileName: string;
  targetSelector?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    const target = document.querySelector(targetSelector);
    if (!(target instanceof HTMLElement)) {
      setError("Certificate is not ready yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await downloadCertificatePdf(target, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onMouseEnter={() => {
          void import("html2canvas-pro");
          void import("jspdf");
        }}
        onClick={() => void handleDownload()}
        className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
      >
        {busy ? "Preparing PDF…" : "Download PDF"}
      </button>
      {error ? <p className="mt-2 text-sm text-caisbe-red">{error}</p> : null}
    </div>
  );
}
