"use client";
// Volunteer study, facilitator view: anonymous responses stored on this device, a pass-rate summary by language and reading level
// (the same rule as services/analytics/comprehension.py), the questions missed most, and CSV/JSON export for scripts/analyse_study.py.
import { Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/PublicChrome";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { clearResponses, loadResponses, summarise, toCSV, type StudyResponse } from "@/lib/study";

const save = (name: string, body: string, type: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

export default function StudyResults() {
  const { t } = useI18n();
  const [rows, setRows] = useState<StudyResponse[]>([]);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setRows(loadResponses()), []);
  const s = summarise(rows);
  const name = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;
  const stamp = new Date().toISOString().slice(0, 10);
  const btn = "inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold transition hover:border-brand-500 disabled:opacity-50";

  return (
    <div className="theme-light min-h-[100svh] bg-canvas text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6"><Brand /><Link href="/study" className="text-sm font-semibold text-brand-700 hover:underline">{t("study.toParticipant")}</Link></header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-16 sm:px-6">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-[-0.03em]">{t("study.resultsTitle")}</h1>
          <p className="mt-2 max-w-3xl text-ink/75">{t("study.resultsLead")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="me-auto text-sm"><span className="text-2xl font-bold tabular-nums" data-testid="study-total">{s.total}</span> {t("study.responses")}</p>
          <button className={btn} disabled={!rows.length} onClick={() => save(`kinsight-study-${stamp}.csv`, toCSV(rows), "text/csv")} data-testid="study-csv"><Download aria-hidden className="h-4 w-4" />CSV</button>
          <button className={btn} disabled={!rows.length} onClick={() => save(`kinsight-study-${stamp}.json`, JSON.stringify(rows, null, 2), "application/json")}><Download aria-hidden className="h-4 w-4" />JSON</button>
          {confirm ? (
            <span className="inline-flex items-center gap-2 text-sm">
              {t("study.clearSure")}
              <button className={`${btn} border-unsure-fg text-unsure-fg`} onClick={() => { clearResponses(); setRows([]); setConfirm(false); }} data-testid="study-clear-yes">{t("study.clearYes")}</button>
              <button className={btn} onClick={() => setConfirm(false)}>{t("study.clearNo")}</button>
            </span>
          ) : (
            <button className={btn} disabled={!rows.length} onClick={() => setConfirm(true)}><Trash2 aria-hidden className="h-4 w-4" />{t("study.clear")}</button>
          )}
        </div>

        <section className="card-flush" aria-labelledby="by">
          <h2 id="by" className="border-b border-line px-5 py-3 font-semibold">{t("study.byGroup")}</h2>
          {s.groups.length ? (
            <table className="w-full text-sm">
              <thead className="text-start text-muted"><tr><th className="px-5 py-2 text-start font-medium">{t("study.colLang")}</th><th className="px-5 py-2 text-start font-medium">{t("study.colLevel")}</th><th className="px-5 py-2 text-end font-medium">n</th><th className="px-5 py-2 text-end font-medium">{t("study.colPass")}</th></tr></thead>
              <tbody>
                {s.groups.map((g) => (
                  <tr key={g.language + g.reading_level} className="border-t border-line">
                    <td className="px-5 py-2">{name(g.language)}</td><td className="px-5 py-2">{t(`level.${g.reading_level}`)}</td>
                    <td className="px-5 py-2 text-end tabular-nums">{g.n}</td><td className="px-5 py-2 text-end font-semibold tabular-nums">{g.pass_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="px-5 py-6 text-sm text-muted">{t("study.empty")}</p>}
          {s.groups.length > 1 && (
            <p className="border-t border-line px-5 py-3 text-sm">{t("study.gap").replace("{gap}", String(s.gap_points)).replace("{target}", String(s.target_gap_points))}</p>
          )}
        </section>

        {s.most_missed.length > 0 && (
          <section className="card" aria-labelledby="mm">
            <h2 id="mm" className="font-semibold">{t("study.mostMissed")}</h2>
            <ul className="mt-3 space-y-1 text-sm">{s.most_missed.map(([q, n]) => <li key={q} className="flex justify-between gap-4"><span className="font-mono">{q}</span><span className="tabular-nums">{n}</span></li>)}</ul>
          </section>
        )}
        <p className="text-xs text-muted">{t("study.note")}</p>
      </main>
    </div>
  );
}
