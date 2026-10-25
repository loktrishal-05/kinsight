"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Analyst() {
  const { t } = useI18n();
  const dash = useQuery({ queryKey: ["dash"], queryFn: api.dashboard });
  const comp = useQuery({ queryKey: ["comp"], queryFn: api.comprehension });
  const cap = useQuery({ queryKey: ["cap"], queryFn: api.capacity });
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("analyst.title")}</h1>
      <div className="card">
        <p className="note">{t("analyst.suppressed")}</p>
        <table className="mt-2 w-full text-start"><tbody>
          {dash.data && Object.entries(dash.data.cells).map(([k, v]) => <tr key={k}><th className="text-start font-normal">{k}</th><td>{v === null ? "—" : v}</td></tr>)}
        </tbody></table>
        <p className="mt-2 text-sm">{t("analyst.budget")}: {dash.data?.budget_remaining}</p>
      </div>
      <div className="card">
        <h2 className="mb-2 font-medium">{t("analyst.comp")}</h2>
        <table className="w-full text-start"><tbody>
          {comp.data?.groups.map((g: any) => <tr key={g.language + g.reading_level}><td>{g.language} / {g.reading_level}</td><td>n = {g.n}</td><td>{g.pass_rate}%</td></tr>)}
        </tbody></table>
        <p className="mt-2 text-sm">{t("analyst.gap")}: {comp.data?.gap_points} / {comp.data?.target_gap_points}</p>
        <p className="text-xs text-slate-600">{comp.data?.label}</p>
      </div>
      <div className="card">
        <h2 className="mb-2 font-medium">{t("analyst.capacity")}</h2>
        <p className="note">{t("analyst.illustrative")}</p>
        <table className="mt-2 w-full text-start"><tbody>
          {cap.data?.runs.map((r: any) => <tr key={r.policy}><td>{r.policy}</td><td>median {r.median_days} d</td><td>p95 {r.p95_days} d</td><td>tier 3 in window {Math.round(r.tier3_within_window * 100)}%</td></tr>)}
        </tbody></table>
      </div>
    </section>
  );
}
