"use client";

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

export function receiptPdfFileName(orderNumber: string) {
  const stem = orderNumber.trim().replace(/[^\w.-]+/g, "-").replace(/-+/g, "-") || "receipt";
  return `caisbe-receipt-${stem}.pdf`;
}

/** Rasterize the on-screen receipt and download it as one portrait page. */
export async function downloadReceiptPdf(source: HTMLElement, filename: string) {
  if (typeof document === "undefined") return;

  await document.fonts.ready;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const width = 720;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${width}px`,
    "background:#ffffff",
    "z-index:-1",
    "pointer-events:none",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.boxShadow = "none";
  clone.style.margin = "0";
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);
    const canvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: 2,
      width,
      windowWidth: width,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const ratio = canvas.height / canvas.width;
    let drawWidth = maxWidth;
    let drawHeight = drawWidth * ratio;
    if (drawHeight > maxHeight) {
      drawHeight = maxHeight;
      drawWidth = drawHeight / ratio;
    }
    const x = (pageWidth - drawWidth) / 2;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, margin, drawWidth, drawHeight, undefined, "FAST");
    pdf.save(filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    host.remove();
  }
}
