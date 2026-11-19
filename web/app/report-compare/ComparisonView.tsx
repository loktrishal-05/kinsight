"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { referenceLinks, reportedTerm, type ComparisonRow, type Finding } from "@/lib/report-compare";

const PARTNERS = ["first", "second"] as const;
const FILTERS = ["both", "first", "second"] as const;
const QUESTIONS = ["meaning", "coverage", "questions"] as const;

export default function ComparisonView({ rows }: { rows: [string, ComparisonRow][] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<"all" | (typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(rows[0][0]);
  const groupOf = (row: ComparisonRow) => row.first.length && row.second.length ? "both" : row.first.length ? "first" : "second";
  const counts = { both: 0, first: 0, second: 0 };
  for (const [, row] of rows) counts[groupOf(row)]++;
  const shown = rows.filter(([, row]) => (filter === "all" || groupOf(row) === filter)
    && `${row.genes} ${row.condition}`.toLowerCase().includes(search.trim().toLowerCase()));
  const active = rows.find(([key]) => key === selected)?.[1] ?? rows[0][1];

  return <section className="space-y-5" aria-labelledby="report-comparison">
    <div>
      <h2 id="report-comparison" className="font-display text-2xl font-semibold">{t("reportCompare.findings")}</h2>
      <p role="status">{t("reportCompare.overlap").replace("{count}", String(counts.both))}</p>
      <p className="mt-2 text-muted">{t("reportCompare.interpretation")}</p>
    </div>
    <section className="card space-y-4" aria-labelledby="report-chart">
      <h3 id="report-chart" className="font-semibold">{t("reportCompare.chart")}</h3>
      <p className="text-sm text-muted">{t("reportCompare.chartHelp")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {FILTERS.map((key) => <button key={key} type="button" aria-pressed={filter === key}
          onClick={() => setFilter(filter === key ? "all" : key)}
          className={`space-y-2 rounded-lg border p-3 text-start ${filter === key ? "border-brand-600 bg-brand-50" : "border-line"}`}>
          <span className="flex justify-between gap-2"><span>{t(`reportCompare.chart.${key}`)}</span><strong>{counts[key]}</strong></span>
          <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-sunk">
            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${100 * counts[key] / rows.length}%` }} />
          </span>
        </button>)}
      </div>
    </section>
    <section className="card space-y-4" aria-labelledby="report-guide">
      <h3 id="report-guide" className="font-display text-xl font-semibold">{t("reportCompare.guide")}</h3>
      <label className="block text-sm font-semibold">{t("reportCompare.chooseFinding")}
        <select className="field mt-1 w-full" value={selected} onChange={(event) => setSelected(event.target.value)}>
          {rows.map(([key, row]) => <option value={key} key={key}>{row.condition}{row.genes === "-" ? "" : ` · ${row.genes}`}</option>)}
        </select>
      </label>
      <Guide key={selected} row={active} />
    </section>
    <div className="flex flex-wrap items-end gap-3">
      <label className="grow text-sm font-semibold">{t("reportCompare.search")}
        <input type="search" className="field mt-1 w-full" autoComplete="off" spellCheck={false} value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      {filter !== "all" && <button type="button" className="btn-quiet" onClick={() => setFilter("all")}>{t("reportCompare.allRows")}</button>}
    </div>
    {shown.length ?
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a horizontally scrolling region must be focusable so keyboard users can scroll it (WCAG 2.1.1)
      <div className="card-flush overflow-x-auto" tabIndex={0} role="region" aria-labelledby="report-comparison">
      <table className="w-full min-w-[36rem] table-fixed divide-y divide-line text-start text-sm">
        <thead className="bg-sunk"><tr>
          <th scope="col" className="p-3 text-start">{t("reportCompare.condition")}</th>
          {PARTNERS.map((side) => <th key={side} scope="col" className="p-3 text-start">{t(`reportCompare.${side}`)}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-line">
          {shown.map(([key, row]) => <tr key={key}>
            <th scope="row" className="p-3 text-start align-top [overflow-wrap:anywhere]">
              <p><bdi>{row.condition}</bdi></p>
              {row.genes !== "-" && <p className="mt-1 font-normal text-muted"><bdi>{row.genes}</bdi></p>}
              {referenceLinks(row).map(({ label, url }) => <a className="mt-1 block w-fit font-normal text-brand-700 underline" key={url} href={url}
                referrerPolicy="no-referrer" rel="noreferrer" target="_blank">MedlinePlus · <bdi>{label}</bdi></a>)}
            </th>
            {PARTNERS.map((side) => <td className="p-3 align-top [overflow-wrap:anywhere]" key={side}><Findings rows={row[side]} /></td>)}
          </tr>)}
        </tbody>
      </table>
    </div> : <p role="status">{t("reportCompare.noRows")}</p>}
    <p className="text-sm text-muted">{t("reportCompare.references")}</p>
  </section>;
}

function Findings({ rows }: { rows: Finding[] }) {
  const { t } = useI18n();
  if (!rows.length) return <span className="text-muted">{t("reportCompare.noEntry")}</span>;
  return <ul className="space-y-3">
    {rows.map(({ result, details }, index) => <li key={index}>
      <p><bdi>{result}</bdi></p>
      {details && <p className="text-muted"><bdi>{details}</bdi></p>}
    </li>)}
  </ul>;
}

function Guide({ row }: { row: ComparisonRow }) {
  const { t } = useI18n();
  const [question, setQuestion] = useState<(typeof QUESTIONS)[number]>("meaning");
  return <>
    <div className="flex flex-wrap gap-2">
      {QUESTIONS.map((key) => <button key={key} type="button" aria-pressed={question === key}
        className={question === key ? "btn" : "btn-quiet"} onClick={() => setQuestion(key)}>{t(`reportCompare.ask.${key}`)}</button>)}
    </div>
    <div className="space-y-3 rounded-lg bg-sunk p-4 [overflow-wrap:anywhere]" aria-live="polite">
      {question === "meaning" ? PARTNERS.map((side) => <div key={side} className="space-y-2">
        <h4 className="font-semibold">{t(`reportCompare.${side}`)}</h4>
        {row[side].length ? row[side].map(({ result, details }, index) => <div key={index}>
          <p><strong><bdi>{result}</bdi></strong></p>
          <p>{t(`reportCompare.term.${reportedTerm(result)}`)}</p>
          {details && <p className="text-muted"><bdi>{details}</bdi></p>}
        </div>) : <p>{t("reportCompare.term.missing")}</p>}
      </div>) : <p>{t(`reportCompare.answer.${question}`)}</p>}
    </div>
    <a className="text-sm text-brand-700 underline" href="https://medlineplus.gov/genetics/understanding/testing/interpretingresults/"
      referrerPolicy="no-referrer" rel="noreferrer" target="_blank">{t("reportCompare.readingSource")}</a>
  </>;
}
