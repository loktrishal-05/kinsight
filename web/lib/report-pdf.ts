import { withReportOcr } from "./report-image";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 40;
const MAX_PDF_TEXT = 400_000;
const MAX_SCAN_PAGES = 6;

export async function readReportPdf(file: File, lang: string, signal: AbortSignal) {
  if (file.size > MAX_PDF_BYTES) throw new Error("pdfLimit");
  const signature = await file.slice(0, 5).text();
  if (signature !== "%PDF-") throw new Error("pdfUnreadable");
  signal.throwIfAborted();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await import("pdfjs-dist");
  signal.throwIfAborted();
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
  const task = pdfjs.getDocument({ data, useWorkerFetch: false, useWasm: false, maxImageSize: 16_000_000, stopAtErrors: true });
  const cancel = () => { void task.destroy().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages < 1 || pdf.numPages > MAX_PDF_PAGES) throw new Error("pdfLimit");
    const pages: string[] = [];
    let length = 0;
    for (let index = 1; index <= pdf.numPages; index++) {
      signal.throwIfAborted();
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      const extracted = content.items.map((item) => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("");
      pages.push(extracted);
      length += extracted.length + 2;
      if (length > MAX_PDF_TEXT) throw new Error("pdfLimit");
    }
    const text = pages.join("\n\n").trim();
    if (text) return { text, pages, scanned: false };
    if (pdf.numPages > MAX_SCAN_PAGES) throw new Error("pdfScanLimit");
    const scans = await withReportOcr(lang, signal, async (recognize) => {
      const pages: string[] = [];
      let length = 0;
      for (let index = 1; index <= pdf.numPages; index++) {
        signal.throwIfAborted();
        const page = await pdf.getPage(index);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 2200 / Math.max(base.width, base.height)) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        try {
          await page.render({ canvas, viewport }).promise;
          const extracted = await recognize(canvas);
          length += extracted.length + 2;
          if (length > MAX_PDF_TEXT) throw new Error("pdfLimit");
          pages.push(extracted);
        } finally {
          canvas.width = 0;
          page.cleanup();
        }
      }
      return pages;
    });
    const scanText = scans.join("\n\n").trim();
    if (!scanText) throw new Error("pdfEmpty");
    return { text: scanText, pages: scans, scanned: true };
  } finally {
    signal.removeEventListener("abort", cancel);
    if (!signal.aborted) await task.destroy();
  }
}
