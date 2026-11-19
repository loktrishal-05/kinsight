"use client";
import { Download, Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

type Cell = string | number | null;

// Aggregates only: a hidden (suppressed) cell is exported as an empty field, never as its value.
export const csv = (rows: Cell[][]) => rows.map((r) => r.map((c) => (c === null ? "" : /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(",")).join("\r\n");

// Every chart has a text summary, a table alternative and, where useful, a CSV of the same aggregates.
export function ChartCard({ id, title, summary, head, rows, children, file }: {
  id: string; title: string; summary: string; head: string[]; rows: Cell[][]; children: ReactNode; file?: string;
}) {
  const { t } = useI18n();
  const [table, setTable] = useState(false);
  return (
    <section className="card space-y-3" aria-labelledby={`${id}-title`} data-demo={id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="text-lg font-semibold">{title}</h2>
        <span className="flex flex-wrap gap-2">
          <button type="button" className="btn-quiet btn-sm" aria-pressed={table} onClick={() => setTable(!table)}><Table2 aria-hidden className="h-4 w-4" />{t("chart.table")}</button>
          {file && <a className="btn-quiet btn-sm" download={`${file}.csv`} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv([head, ...rows]))}`}><Download aria-hidden className="h-4 w-4" />CSV</a>}
        </span>
      </div>
      <p className="text-sm text-muted" data-demo="chart-summary">{summary}</p>
      {table ? (
        <table className="w-full text-sm" data-not-risk>
          <thead><tr className="text-xs text-muted">{head.map((h) => <th key={h} scope="col" className="py-1 text-start font-semibold">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={String(r[0])} className="border-t border-line">{r.map((c, i) => i === 0
            ? <th key={i} scope="row" className="py-1 text-start font-normal">{c}</th>
            : <td key={i} className="py-1 tabular-nums" dir="ltr">{c === null ? t("analyst.hidden") : c}</td>)}</tr>)}</tbody>
        </table>
      ) : children}
    </section>
  );
}
