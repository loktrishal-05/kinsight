"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState, Estimate, Notice, PageHeader } from "@/components/ui";
import { IconArray } from "@/components/visuals";
import { api } from "@/lib/api";
import { DATA, conditionLabel } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";
import { RELATIONS, STATUS_A, STATUS_B, type ScenarioRequest } from "@/lib/scenario";

type Draft = Omit<ScenarioRequest, "lang">;
const FIRST = DATA.cohort.carriers[0].condition_id;
const START: Draft[] = [
  { condition_id: FIRST, status_a: "carrier", status_b: "untested", relation: "none", children: 1 },
  { condition_id: FIRST, status_a: "carrier", status_b: "untested", relation: "first_cousins", children: 1 },
];
const pct = (x: number) => (x === 0 ? "0%" : x < 0.01 ? "<1%" : `${Math.round(x * 100)}%`);

// Hypothetical what-if scenarios. Every figure comes from the engine through the API; options are described, never ranked.
export default function Scenarios() {
  const { t, lang } = useI18n();
  const [drafts, setDrafts] = useState<Draft[]>(START);
  const couple = useQuery({ queryKey: ["couple"], queryFn: () => api.couple() });
  if (couple.data?.awaiting_counsellor) return <section className="space-y-6"><PageHeader title={t("scen.title")} /><Notice>{t("couple.tier3")}</Notice></section>;
  return (
    <section className="space-y-6">
      <PageHeader title={t("scen.title")} lead={t("scen.lead")} />
      <Notice>{t("scen.hypothetical")}</Notice>
      <div className="grid gap-6 lg:grid-cols-2">
        {drafts.map((d, i) => <Card key={i} index={i} draft={d} lang={lang} onChange={(next) => setDrafts(drafts.map((x, j) => (j === i ? next : x)))} />)}
      </div>
    </section>
  );
}

function Card({ index, draft, lang, onChange }: { index: number; draft: Draft; lang: string; onChange: (d: Draft) => void }) {
  const { t } = useI18n();
  const run = useQuery({ queryKey: ["whatif", draft, lang], queryFn: () => api.whatIf({ ...draft, lang }), retry: false });
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const id = `s${index}`;
  const d = run.data;
  const p = d?.chance_per_pregnancy.value ?? 0, all = d?.chance_at_least_one.value ?? 0;
  return (
    <article className="card space-y-4" aria-labelledby={`${id}-title`} data-demo={`scenario-${index}`}>
      <h2 id={`${id}-title`} className="text-lg font-semibold">{t("scen.scenario")} {index + 1}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor={`${id}-cond`}>{t("scen.condition")}
          <select id={`${id}-cond`} className="field mt-1" value={draft.condition_id} onChange={(e) => set({ condition_id: e.target.value })}>
            {DATA.cohort.carriers.map((c) => <option key={c.condition_id} value={c.condition_id}>{conditionLabel(c.condition_id, lang)}</option>)}
          </select></label>
        <label className="block text-sm font-medium" htmlFor={`${id}-rel`}>{t("scen.relation")}
          <select id={`${id}-rel`} className="field mt-1" value={draft.relation} onChange={(e) => set({ relation: e.target.value as Draft["relation"] })}>
            {RELATIONS.map((r) => <option key={r} value={r}>{t(r === "none" ? "plan.relation.none" : `plan.relation.${r}`)}</option>)}
          </select></label>
        <label className="block text-sm font-medium" htmlFor={`${id}-a`}>{t("scen.partnerA")}
          <select id={`${id}-a`} className="field mt-1" value={draft.status_a} onChange={(e) => set({ status_a: e.target.value as Draft["status_a"] })}>
            {STATUS_A.map((s) => <option key={s} value={s}>{t(`scen.status.${s}`)}</option>)}
          </select></label>
        <label className="block text-sm font-medium" htmlFor={`${id}-b`}>{t("scen.partnerB")}
          <select id={`${id}-b`} className="field mt-1" value={draft.status_b} onChange={(e) => set({ status_b: e.target.value as Draft["status_b"] })}>
            {STATUS_B.map((s) => <option key={s} value={s}>{t(`scen.status.${s}`)}</option>)}
          </select></label>
      </div>
      <label className="block text-sm font-medium" htmlFor={`${id}-n`}>{t("scen.children")}: <b className="tabular-nums" dir="ltr">{draft.children}</b>
        <input id={`${id}-n`} type="range" min={1} max={6} step={1} className="mt-1 w-full" value={draft.children} aria-valuetext={String(draft.children)}
          onChange={(e) => set({ children: Number(e.target.value) })} /></label>

      {run.isError && <ErrorState>{t("scen.unsupported")}</ErrorState>}
      {d && <div className="space-y-4" aria-live="polite">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">{d.inheritance === "XLR" ? t("couple.chanceSon") : t("couple.chance")}</dt>
            <dd><Estimate est={d.chance_per_pregnancy}><span className="text-3xl font-bold tabular-nums text-brand-700" dir="ltr">{pct(p)}</span></Estimate></dd></div>
          <div><dt className="text-sm text-muted">{t("scen.atLeastOne").replace("{n}", String(d.children))}</dt>
            <dd><Estimate est={d.chance_at_least_one}><span className="text-3xl font-bold tabular-nums text-brand-700" dir="ltr">{pct(all)}</span></Estimate></dd></div>
          {d.partner_carrier_chance && <div className="sm:col-span-2"><dt className="text-sm text-muted">{t("scen.partnerCarrier")}</dt>
            <dd><Estimate est={d.partner_carrier_chance}><span className="text-xl font-semibold tabular-nums" dir="ltr">{pct(d.partner_carrier_chance.value ?? 0)}</span></Estimate></dd></div>}
        </dl>
        <IconArray risk={p} />
        <table className="w-full text-sm">
          <caption className="mb-1 text-start text-muted">{t("scen.tableCaption")}</caption>
          <thead><tr><th scope="col" className="text-start">{t("scen.what")}</th><th scope="col" className="text-start">{t("scen.outOf100")}</th></tr></thead>
          <tbody>
            <tr><th scope="row" className="text-start font-normal">{t("scen.eachPregnancy")}</th><td className="tabular-nums" dir="ltr">{Math.round(p * 100)}</td></tr>
            <tr><th scope="row" className="text-start font-normal">{t("scen.atLeastOne").replace("{n}", String(d.children))}</th><td className="tabular-nums" dir="ltr">{Math.round(all * 100)}</td></tr>
          </tbody>
        </table>
        <div>
          <h3 className="mb-2 font-semibold">{t("scen.options")}</h3>
          <ul className="space-y-2 text-sm">{d.options.map((o) => <li key={o.id} className="rounded-lg border border-line p-3"><b>{o.title}</b><p className="text-muted">{o.changes}</p></li>)}</ul>
        </div>
      </div>}
    </article>
  );
}
