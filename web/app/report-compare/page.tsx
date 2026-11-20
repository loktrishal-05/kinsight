"use client";

import { useMemo, useState } from "react";
import { Brand, LangSwitch } from "@/components/PublicChrome";
import { PageHeader } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { compareReports, findingSourceKey, indexReportSource, parseReport, type ReportSource } from "@/lib/report-compare";
import ComparisonView from "./ComparisonView";
import ReportAttachment from "./ReportAttachment";

const PARTNERS = ["first", "second"] as const;
type Partner = (typeof PARTNERS)[number];
const FIELDS = ["genes", "condition", "result", "details"] as const;
type Draft = { text: string; source?: ReturnType<typeof indexReportSource>; confirmed: Set<string> };
const EMPTY_DRAFT: Draft = { text: "", confirmed: new Set() };
const EMPTY_REPORTS = { first: EMPTY_DRAFT, second: EMPTY_DRAFT };
const SAMPLE_REPORTS = {
  first: { ...EMPTY_DRAFT, text: "HBB | Beta thalassemia | Carrier finding" },
  second: { ...EMPTY_DRAFT, text: "HBB | Beta thalassemia | Not detected | Limited panel" },
};

export default function ReportComparison() {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState(EMPTY_REPORTS);
  const [parsed, setParsed] = useState<{ first: ReturnType<typeof parseReport>; second: ReturnType<typeof parseReport> }>();
  const [reset, setReset] = useState(0);
  const first = useMemo(() => parseReport(drafts.first.text), [drafts.first.text]);
  const second = useMemo(() => parseReport(drafts.second.text), [drafts.second.text]);
  const pending = { first, second };
  const requiresReview = PARTNERS.some((side) => {
    const draft = drafts[side], rows = pending[side].rows;
    return draft.source !== undefined && (!rows || draft.confirmed.size !== rows.reduce(
      (count, row) => count + FIELDS.filter((field) => row[field]).length, 0,
    ));
  });
  const comparison = parsed?.first.rows && parsed.second.rows ? compareReports(parsed.first.rows, parsed.second.rows) : undefined;

  function edit(side: Partner, draft: Draft) {
    setParsed(undefined);
    setDrafts((previous) => ({ ...previous, [side]: draft }));
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Brand />
      <LangSwitch />
    </header>
    <PageHeader title={t("reportCompare.title")} lead={t("reportCompare.lead")} />
    <p className="note">{t("reportCompare.privacy")}</p>
    {!drafts.first.text && !drafts.second.text && drafts.first.source === undefined && drafts.second.source === undefined && (
      <button className="btn-quiet" type="button" onClick={() => { setParsed(undefined); setDrafts(SAMPLE_REPORTS); }}>
        {t("reportCompare.trySample")}
      </button>
    )}
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (!requiresReview) setParsed(pending);
    }}>
      <div className="grid gap-4 md:grid-cols-2">
        {PARTNERS.map((side) => {
          const draft = drafts[side];
          const candidates = pending[side];
          const reviewing = draft.source !== undefined;
          const error = reviewing && draft.text.trim() ? candidates : parsed?.[side];
          return <div className="card space-y-3" key={side}>
            <label htmlFor={`report-${side}`} className="block font-semibold">{t(`reportCompare.${side}`)}</label>
            <ReportAttachment key={`${side}:${reset}`} label={t(`reportCompare.${side}`)} hasDraft={!!draft.text.trim()}
              onUse={(text, source: ReportSource) => {
                setParsed(undefined);
                const indexed = indexReportSource(source);
                setDrafts((previous) => ({
                  ...previous, [side]: { text: text ?? previous[side].text, source: indexed, confirmed: new Set() },
                }));
              }} />
            <textarea id={`report-${side}`} className="field min-h-36 w-full" dir="auto" rows={7} spellCheck={false}
              autoComplete="off" autoCapitalize="off" autoCorrect="off"
              placeholder={t("reportCompare.columns")}
              aria-invalid={!!error?.error} aria-describedby={error?.error ? `report-format report-${side}-error` : "report-format"}
              value={draft.text} onChange={(event) => edit(side, {
                ...draft, text: event.target.value, confirmed: new Set(),
              })} />
            {reviewing && <div className="space-y-3">
              <p className="text-sm">{t("reportCompare.reviewFields")}</p>
              {candidates.rows?.map((row, index) => {
                const snippet = draft.source?.get(findingSourceKey(row));
                return <fieldset className="min-w-0 space-y-2 rounded-lg border border-line p-3" key={index}>
                  <legend className="px-1 text-sm font-semibold">{t("reportCompare.reviewRow").replace("{row}", String(index + 1))}</legend>
                  <p className="break-words text-xs text-muted">{snippet ? <>
                    {snippet.page === undefined ? t("reportCompare.sourceSnippet")
                      : t("reportCompare.sourcePage").replace("{page}", String(snippet.page))} <bdi>{snippet.text}</bdi>
                  </> : t("reportCompare.sourceMissing")}</p>
                  {FIELDS.filter((field) => row[field]).map((field) => {
                    const key = `${index}:${field}`;
                    return <label key={field} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={draft.confirmed.has(key)} onChange={(event) => {
                        const confirmed = new Set(draft.confirmed);
                        if (event.target.checked) confirmed.add(key);
                        else confirmed.delete(key);
                        edit(side, { ...draft, confirmed });
                      }} />
                      <span className="min-w-0 break-words">{t(`reportCompare.field.${field}`)} <bdi>{row[field]}</bdi></span>
                    </label>;
                  })}
                </fieldset>;
              })}
            </div>}
            {error?.error && <p id={`report-${side}-error`} role="alert" className="text-sm text-unsure-fg">
              {t(`reportCompare.error.${error.error}`).replace("{line}", String(error.line ?? ""))}
            </p>}
          </div>;
        })}
      </div>
      <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">{t("reportCompare.formatHelp")}</summary>
        <p id="report-format" className="mt-2 text-sm">{t("reportCompare.format")}</p>
      </details>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn" disabled={requiresReview}>{t("reportCompare.compare")}</button>
        <button type="button" className="btn-quiet" onClick={() => { setDrafts(EMPTY_REPORTS); setParsed(undefined); setReset(reset + 1); }}>
          {t("reportCompare.clear")}
        </button>
      </div>
    </form>

    {comparison && <ComparisonView rows={comparison} />}
  </main>;
}
