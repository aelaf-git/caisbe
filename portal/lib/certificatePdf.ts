"use client";

import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
} from "@/components/certificates/MembershipCertificateDocument";

function waitForImages(root: HTMLElement) {
  return Promise.all(
    Array.from(root.querySelectorAll("img")).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

export function certificatePdfFileName(parts: Array<string | null | undefined>) {
  const stem =
    parts
      .map((part) => (part || "").trim())
      .filter(Boolean)
      .join("-")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "certificate";
  return stem.toLowerCase().endsWith(".pdf") ? stem : `${stem}.pdf`;
}

/** Rasterize the on-screen certificate (as drawn) and download it as a one-page PDF. */
export async function downloadCertificatePdf(source: HTMLElement, filename: string) {
  if (typeof document === "undefined") return;

  await document.fonts.ready;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${CERTIFICATE_WIDTH_PX}px`,
    `height:${CERTIFICATE_HEIGHT_PX}px`,
    "background:#ffffff",
    "overflow:hidden",
    "z-index:-1",
    "pointer-events:none",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.boxShadow = "none";
  clone.style.margin = "0";
  clone.style.width = `${CERTIFICATE_WIDTH_PX}px`;
  clone.style.height = `${CERTIFICATE_HEIGHT_PX}px`;
  clone.style.minWidth = `${CERTIFICATE_WIDTH_PX}px`;
  clone.style.minHeight = `${CERTIFICATE_HEIGHT_PX}px`;
  clone.style.maxWidth = "none";
  clone.style.position = "relative";
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);
    const canvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: 2,
      width: CERTIFICATE_WIDTH_PX,
      height: CERTIFICATE_HEIGHT_PX,
      windowWidth: CERTIFICATE_WIDTH_PX,
      windowHeight: CERTIFICATE_HEIGHT_PX,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    pdf.save(certificatePdfFileName([filename]));
  } finally {
    host.remove();
  }
}
