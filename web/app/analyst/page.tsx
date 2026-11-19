"use client";
import { useQuery } from "@tanstack/react-query";
import { EyeOff } from "lucide-react";
import { useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const MIN_CELL = 10; // same rule as configs/privacy.yaml: cells below this are hidden

export default function Analyst() {
  const { t, lang } = useI18n();
  const l = lang === "ar" ? "ar" : "en";
  const ins = useQuery({ queryKey: ["insights"], queryFn: api.insights });
  const dash = useQuery({ queryKey: ["dash"], queryFn: api.dashboard });
  const out = useQuery({ queryKey: ["outcomes"], queryFn: api.outcomes });
  const [all, setAll] = useState(false);
  const [slots, setSlots] = useState(16);
  const d = ins.data;
  if (!d) return <p className="text-muted">{t("loading")}</p>;

  const tiers = [1, 2, 3].map((k) => [k, d.cohort.tiers[String(k)] ?? 0] as const);
  const total = tiers.reduce((a, [, n]) => a + n, 0);
  const rows = [...d.cohort.carriers].sort((a, b) => b.carriers - a.carriers).slice(0, all ? 99 : 10);
  const max = Math.max(1, ...d.cohort.carriers.map((c) => c.carriers));
  const grid = d.capacity.grid.filter((g) => g.slots === slots);
  const weekly = d.capacity.weekly;
  const maxW = Math.max(1, ...weekly.map((w) => w.median_wait ?? 0));
  const maxS = Math.max(1, ...weekly.map((w) => w.served));
  const bands = ["18-24", "25-29", "30-34", "35-44"];
  const combos = (["en", "ar"] as const).flatMap((g) => (["basic", "standard"] as const).map((v) => [g, v] as const));
  const cell = (g: string, v: string, b: string) => d.comprehension.cells.find((c) => c.language === g && c.level === v && c.age_band === b);
  // Tint capped at 45% so dark text keeps a contrast of at least about 8:1 on every cell (WCAG 1.4.3).
  const tone = (p: number) => `rgb(var(--b600) / ${(0.08 + 0.37 * Math.min(1, Math.max(0, (p - 55) / 45))).toFixed(2)})`;
  const W = 640, H = 150, step = (W - 40) / Math.max(1, weekly.length - 1);
  const line = weekly.map((w, i) => `${i ? "L" : "M"}${20 + i * step},${H - 14 - ((w.median_wait ?? 0) / maxW) * (H - 34)}`).join(" ");

  // Care funnel from the live outcome counts; a hidden count stays hidden in the chart, the table and the CSV.
  const metric = (name: string) => out.data?.metrics.find((m) => m.name === name);
  const steps = ["result_viewed", "teach_back_passed", "prep_sheet_created", "session_booked", "cascade_reached"].map((n) => [t(`outcome.${n}`), metric(n)?.total ?? null] as [string, number | null]);
  const top = Math.max(1, ...steps.map(([, v]) => v ?? 0));
  const funnel = out.data && (
    <ChartCard id="funnel" title={t("chart.funnel")} file="funnel" head={[t("chart.step"), t("chart.count")]} rows={steps}
      summary={steps.every(([, v]) => v === null) ? t("chart.allHidden") : t("chart.funnelSummary")}>
      <ol className="space-y-2" data-not-risk>{steps.map(([label, v]) => (
        <li key={label} className="grid grid-cols-[minmax(0,14rem)_1fr_5rem] items-center gap-3 text-sm">
          <span>{label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-sunk" aria-hidden>{v !== null && <span className="block h-full rounded-full" style={{ width: `${(100 * v) / top}%`, background: "rgb(var(--b500))" }} />}</span>
          <span className="text-end tabular-nums" dir="ltr">{v ?? <EyeOff aria-label={t("analyst.hidden")} className="ms-auto h-4 w-4" />}</span>
        </li>))}</ol>
    </ChartCard>
  );

  return (
    <section className="space-y-6">
      <PageHeader title={t("analyst.title")} lead={t("analyst.lead")} />
      <Notice>{t("analyst.suppressed")} {t("analyst.budget")}: <b className="tabular-nums">{dash.data?.budget_remaining}</b></Notice>
      {out.data && <section className="card space-y-3" aria-labelledby="outcomes-title" data-demo="outcomes" data-not-risk>
        <h2 id="outcomes-title" className="text-lg font-semibold">{t("outcome.title")}</h2>
        <p className="text-sm text-muted">{t("outcome.lead").replace("{n}", String(out.data.min_cell))}</p>
        {out.data.metrics.some((m) => m.equity_alert) && <p role="alert" className="note">{t("outcome.equity")}: {out.data.metrics.filter((m) => m.equity_alert).map((m) => t(`outcome.${m.name}`)).join(", ")}</p>}
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{out.data.metrics.map((m) => (
          <div key={m.name} className="rounded-lg border border-line p-3">
            <dt className="text-sm text-muted">{t(`outcome.${m.name}`)}</dt>
            <dd className="mt-1">{m.total === null ? <span className="inline-flex items-center gap-1.5 text-sm"><EyeOff aria-hidden className="h-4 w-4" />{t("outcome.hidden").replace("{n}", String(out.data?.min_cell))}</span>
              : <b className="text-2xl tabular-nums" dir="ltr">{m.total}</b>}</dd>
          </div>))}</dl>
        <p className="text-sm">{t("outcome.noMarriage")}</p>
      </section>}

      <ChartCard id="tiers" title={t("analyst.tiers")} file="tiers"
        summary={t("chart.tiersSummary").replace("{n}", String(total)).replace("{t3}", String(tiers[2][1]))}
        head={[t("chart.group"), t("chart.count")]} rows={tiers.map(([k, n]) => [t(`tier.${k}`), n >= MIN_CELL ? n : null])}>
        <div className="flex h-4 overflow-hidden rounded-full bg-sunk" role="img" aria-label={tiers.map(([k, n]) => `${t(`tier.${k}`)}: ${n}`).join(", ")}>
          {tiers.map(([k, n]) => <span key={k} style={{ width: `${(100 * n) / total}%`, background: `rgb(var(--b${k === 1 ? 200 : k === 2 ? 500 : 700}))` }} />)}
        </div>
        <ul data-not-risk className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {tiers.map(([k, n]) => <li key={k} className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: `rgb(var(--b${k === 1 ? 200 : k === 2 ? 500 : 700}))` }} />{t(`tier.${k}`)} <b className="tabular-nums" dir="ltr">{n} ({Math.round((100 * n) / total)}%)</b></li>)}
        </ul>
        <p data-not-risk className="text-xs text-muted">{t("analyst.cohortNote").replace("{n}", String(d.cohort.couples)).replace("{r}", String(Math.round(d.cohort.related_share * 100)))}</p>
      </ChartCard>

      {funnel}

      <div className="card" data-demo="burden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("analyst.burden")}</h2>
          <button className="btn-quiet btn-sm" onClick={() => setAll(!all)}>{all ? t("analyst.top10") : t("analyst.all30")}</button>
        </div>
        <ul>
          {rows.map((c) => (
            <li key={c.condition_id} className="grid grid-cols-[minmax(0,12rem)_1fr_4.5rem] items-center gap-3 border-b border-line py-2 text-sm last:border-0 sm:grid-cols-[minmax(0,18rem)_1fr_4.5rem]">
              <span className="truncate" title={l === "ar" ? c.label_ar : c.label_en}>{l === "ar" ? c.label_ar : c.label_en}</span>
              <span className="h-2 overflow-hidden rounded-full bg-sunk" aria-hidden>
                {c.carriers >= MIN_CELL && <span className="block h-full rounded-full" style={{ width: `${(100 * c.carriers) / max}%`, background: "rgb(var(--b500))" }} />}
              </span>
              <span className="text-end font-semibold tabular-nums" dir="ltr">{c.carriers >= MIN_CELL ? c.carriers : <span className="chip bg-clear-bg text-clear-fg" title={t("analyst.hidden")}><EyeOff aria-hidden className="h-3 w-3" /></span>}</span>
            </li>
          ))}
        </ul>
      </div>

      <ChartCard id="weekly" title={t("analyst.weekly")} file="weekly"
        summary={`${t("analyst.weeklyNote")} ${t("chart.weeklySummary").replace("{w}", String(weekly.length)).replace("{m}", String(maxW))}`}
        head={[t("analyst.week"), t("analyst.waitLine"), t("chart.served")]} rows={weekly.map((w, i) => [i + 1, w.median_wait ?? null, w.served])}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("analyst.weekly")} style={{ direction: "ltr" }}>
          {weekly.map((w, i) => <rect key={i} x={20 + i * step - 3.5} y={H - 14 - (w.served / maxS) * (H - 34)} width={7} height={(w.served / maxS) * (H - 34)} rx={2} fill="rgb(var(--b100))" />)}
          <path d={line} fill="none" stroke="rgb(var(--b600))" strokeWidth={2} strokeLinejoin="round" />
          <line x1={20} x2={W - 20} y1={H - 14} y2={H - 14} stroke="rgb(var(--line))" />
          <text x={20} y={H - 1} fontSize="10" fill="rgb(var(--muted))">{t("analyst.week")} 1</text>
          <text x={W - 20} y={H - 1} fontSize="10" textAnchor="end" fill="rgb(var(--muted))">{weekly.length}</text>
        </svg>
        <p className="flex flex-wrap gap-4 text-xs text-muted"><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-brand-600" />{t("analyst.waitLine")}</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-100" />{t("analyst.servedBars")}</span></p>
      </ChartCard>

      <div className="card" data-demo="heatmap">
        <h2 className="mb-1 text-lg font-semibold">{t("analyst.comp")}</h2>
        <p className="mb-3 text-sm text-muted">{d.comprehension.label}</p>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a horizontally scrolling region must be focusable so keyboard users can scroll it (WCAG 2.1.1) */}
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("analyst.comp")}>
          <table className="w-full min-w-[26rem] text-sm">
            <thead><tr className="text-xs text-muted"><th className="py-2 text-start font-semibold" />{bands.map((b) => <th key={b} className="px-2 py-2 text-center font-semibold" dir="ltr">{b}</th>)}</tr></thead>
            <tbody>
              {combos.map(([g, v]) => (
                <tr key={g + v}>
                  <th scope="row" className="py-1 pe-3 text-start font-medium">{g.toUpperCase()} · {t(`level.${v}_short`)}</th>
                  {bands.map((b) => { const c = cell(g, v, b)!; return (
                    <td key={b} className="p-1"><div className="grid h-10 place-items-center rounded-lg text-xs font-bold tabular-nums" style={{ background: tone(c.pass_rate), color: "rgb(var(--ink))" }} title={`n = ${c.n}`} dir="ltr">{Math.round(c.pass_rate)}%</div></td>
                  ); })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">{t("analyst.gap")}: <b className="tabular-nums" dir="ltr">{d.comprehension.gap_points} / {d.comprehension.target_gap_points}</b>{" "}
          <span className={`chip ${d.comprehension.gap_points <= d.comprehension.target_gap_points ? "bg-brand-50 text-brand-800" : "bg-unsure-bg text-unsure-fg"}`}>{d.comprehension.gap_points <= d.comprehension.target_gap_points ? t("analyst.within") : t("analyst.above")}</span></p>
      </div>

      <div className="card space-y-4" data-demo="capacity">
        <h2 className="text-lg font-semibold">{t("analyst.capacity")}</h2>
        <Notice>{t("analyst.illustrative")}</Notice>
        <label className="block text-sm font-medium">
          {t("analyst.slots")}: <b className="tabular-nums" dir="ltr">{slots}</b>
          <input type="range" data-demo="slots" min={8} max={24} step={2} value={slots} onChange={(e) => setSlots(+e.target.value)} className="mt-2 block w-full max-w-md accent-[rgb(var(--b600))]" />
        </label>
        <ul className="space-y-3">
          {grid.map((g) => (
            <li key={g.policy} className="grid gap-1 sm:grid-cols-[14rem_1fr] sm:items-center sm:gap-4">
              <span className="font-medium">{t(`policy.${g.policy}`)}</span>
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span>{t("cap.median")} <b className="tabular-nums" dir="ltr">{g.median_days}</b> {t("cap.days")}</span>
                <span>{t("cap.p95")} <b className="tabular-nums" dir="ltr">{g.p95_days}</b> {t("cap.days")}</span>
                <span data-not-risk>{t("cap.tier3")} <b className="tabular-nums" dir="ltr">{Math.round(g.tier3_within_window * 100)}%</b></span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{d.capacity.label}</p>
      </div>
    </section>
  );
}
