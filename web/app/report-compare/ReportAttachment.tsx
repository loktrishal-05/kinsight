"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { MAX_REPORT_LENGTH, parseReport, type ReportSource, suggestPdfRows } from "@/lib/report-compare";
import { readReportImage } from "@/lib/report-image";
import { readReportPdf } from "@/lib/report-pdf";

type Attachment = { name?: string; text?: string; source?: ReportSource; suggested?: string; error?: string; loading?: boolean };
const ATTACHMENT_ERRORS = ["pdfEmpty", "pdfLimit", "pdfScanLimit", "attachmentFormat", "size", "attachmentType", "imageLimit", "imageUnreadable"];

export default function ReportAttachment({ label, hasDraft, onUse }: {
  label: string; hasDraft: boolean; onUse: (rows: string | undefined, source: ReportSource) => void;
}) {
  const { t, lang } = useI18n();
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<Attachment>({});
  useEffect(() => () => request.current?.abort(), []);

  async function open(file: File) {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setState({ name: file.name, loading: true });
    try {
      const pdf = /\.pdf$/i.test(file.name);
      if (/\.(png|jpe?g)$/i.test(file.name)) {
        const text = await readReportImage(file, lang, current.signal);
        if (!current.signal.aborted) {
          const source = { pages: [text], paginated: false };
          onUse(undefined, source);
          setState({ name: file.name, text, source, suggested: parseReport(text).rows ? text : suggestPdfRows(text) });
        }
        return;
      }
      if (!pdf && !/\.(tsv|txt)$/i.test(file.name)) throw new Error("attachmentType");
      if (!pdf && file.size > MAX_REPORT_LENGTH * 4) throw new Error("size");
      const document = pdf ? await readReportPdf(file, lang, current.signal) : await file.text().then((text) => ({
        text, pages: [text], scanned: false,
      }));
      if (current.signal.aborted) return;
      const parsed = parseReport(document.text);
      if (!pdf && !parsed.rows) throw new Error(parsed.error === "size" ? "size" : "attachmentFormat");
      const rows = parsed.rows ? document.text : suggestPdfRows(document.scanned ? document.text : document.pages[0]);
      const source = { pages: document.pages, paginated: pdf };
      onUse(undefined, source);
      setState({ name: file.name, text: document.text, source, suggested: rows });
    } catch (error) {
      if (current.signal.aborted) return;
      const code = error instanceof Error && ATTACHMENT_ERRORS.includes(error.message) ? error.message
        : /\.(png|jpe?g)$/i.test(file.name) ? "imageUnreadable" : "pdfUnreadable";
      setState({ name: file.name, error: code });
    }
  }

  return <div className="space-y-3 border-b border-line pb-4">
    <label className="relative flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brand-400 bg-brand-50 p-3 focus-within:ring-2 focus-within:ring-brand-600"
      onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) void open(file);
      }}>
      <Upload aria-hidden className="h-5 w-5 shrink-0 text-brand-700" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{t("reportCompare.attach")}</span>
        <span className="block text-sm text-muted">{t("reportCompare.attachTypes")}</span>
      </span>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.tsv,.txt,application/pdf,image/png,image/jpeg,text/plain,text/tab-separated-values"
        aria-label={t("reportCompare.pdf").replace("{partner}", label)} className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void open(file);
        }} />
    </label>
    {state.name && <p className="break-all text-sm font-medium"><bdi>{state.name}</bdi></p>}
    {state.loading && <p role="status" className="flex items-center gap-2 text-sm">
      <LoaderCircle aria-hidden className="h-4 w-4 motion-safe:animate-spin" />{t("reportCompare.reading")}
    </p>}
    {state.error && <p role="alert" className="text-sm text-unsure-fg">{t(`reportCompare.error.${state.error}`)}</p>}
    {state.suggested && <button type="button" className="btn-quiet" onClick={() => {
      if (state.source) onUse(state.suggested, state.source);
    }}>{t(hasDraft ? "reportCompare.replace" : "reportCompare.useSuggested")}</button>}
    {state.text && <details className="rounded-lg bg-sunk p-2">
      <summary className="cursor-pointer text-sm font-semibold">{t("reportCompare.pdfPreview")}</summary>
      <p className="mt-2 text-sm text-muted">{t("reportCompare.previewHelp")}</p>
      <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-sm [overflow-wrap:anywhere]" dir="auto">{state.text}</pre>
    </details>}
  </div>;
}
