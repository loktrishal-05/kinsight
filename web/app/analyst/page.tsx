"use client";
import { useQuery } from "@tanstack/react-query";
import { EyeOff } from "lucide-react";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Analyst() {
  const { t, td } = useI18n();
  const dash = useQuery({ queryKey: ["dash"], queryFn: api.dashboard });
  const comp = useQuery({ queryKey: ["comp"], queryFn: api.comprehension });
  const cap = useQuery({ queryKey: ["cap"], queryFn: api.capacity });
  const max = Math.max(1, ...Object.values(dash.data?.cells ?? {}).map((v) => v ?? 0));
  return (
    <section className="space-y-6">
      <PageHeader title={t("analyst.title")} lead={t("analyst.lead")} />
      <div className="card">
        <ul>
          {dash.data && Object.entries(dash.data.cells).map(([k, v]) => (
            <li key={k} className="row">
              <span className="w-56 shrink-0 text-sm">{td(`cell.${k}`)}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas" aria-hidden>
                {v !== null && <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(100 * v) / max}%` }} />}
              </span>
              <span className="w-16 text-end font-semibold tabular-nums" dir="ltr">
                {v === null ? <span className="chip bg-clear-bg text-clear-fg"><EyeOff aria-hidden className="h-3 w-3" /></span> : Math.round(v)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{t("analyst.suppressed")} {t("analyst.budget")}: <span className="tabular-nums">{dash.data?.budget_remaining}</span></p>
      </div>
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold">{t("analyst.comp")}</h2>
        <table className="w-full text-sm">
          <tbody>
            {comp.data?.groups.map((g: any) => (
              <tr key={g.language + g.reading_level} className="border-b border-line last:border-0">
                <td className="py-2.5 font-medium">{g.language.toUpperCase()} · {t(`level.${g.reading_level}_short`)}</td>
                <td className="text-muted tabular-nums">n = {g.n}</td>
                <td className="text-end font-semibold tabular-nums" dir="ltr">{typeof g.pass_rate === "number" ? `${g.pass_rate}%` : g.pass_rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-muted">{t("analyst.gap")}: <span className="tabular-nums">{comp.data?.gap_points} / {comp.data?.target_gap_points}</span></p>
        <p className="text-xs text-muted">{comp.data?.label}</p>
      </div>
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold">{t("analyst.capacity")}</h2>
        <Notice>{t("analyst.illustrative")}</Notice>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <tbody>
              {cap.data?.runs.map((r: any) => (
                <tr key={r.policy} className="border-b border-line last:border-0">
                  <td className="py-2.5 font-medium">{t(`policy.${r.policy}`)}</td>
                  <td className="tabular-nums">{t("cap.median")} <b dir="ltr">{r.median_days}</b> {t("cap.days")}</td>
                  <td className="tabular-nums">{t("cap.p95")} <b dir="ltr">{r.p95_days}</b> {t("cap.days")}</td>
                  <td className="text-end tabular-nums">{t("cap.tier3")} <b dir="ltr">{Math.round(r.tier3_within_window * 100)}%</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
