"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pause, Pencil, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Notice, PageHeader } from "@/components/ui";
import { Journey, TierChip } from "@/components/visuals";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATES = ["counselling_done", "confirmatory_requested", "confirmatory_done", "specialist_referral_requested", "specialist_referral_done", "closed"];
const STATUSES = ["awaiting_counsellor", "released", "awaiting_user", "tracking", "closed"];

export default function Counsellor() {
  const { t, td } = useI18n();
  const qc = useQueryClient();
  const [sel, setSel] = useState("demo-case");
  const [evidence, setEvidence] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [tier, setTier] = useState(0);
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const queue = useQuery({ queryKey: ["queue"], queryFn: api.queue });
  const brief = useQuery({ queryKey: ["brief", sel], queryFn: () => api.brief(sel) });
  const steps = useQuery({ queryKey: ["referral"], queryFn: api.referral });
  const decide = useMutation({ mutationFn: (d: string) => api.decide(sel, d), onSuccess: () => qc.invalidateQueries() });
  const event = useMutation({
    mutationFn: (e: string) => api.referralEvent(sel, e, evidence),
    onSuccess: () => { setErr(""); qc.invalidateQueries(); },
    onError: () => setErr(t("counsellor.closureNeeds")),
  });
  const brief_ = (b: string) => (b.startsWith("finding_") ? `${t("brief.finding")} ${b.slice(8)}` : td(`brief.${b}`));
  const rows = queue.data ?? [];
  const shown = useMemo(() => rows
    .filter((r) => (!tier || r.tier === tier) && (!status || r.status === status) && (!overdueOnly || (r.due_days ?? 0) < 0) && r.id.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.tier - a.tier || (a.due_days ?? 0) - (b.due_days ?? 0)), [rows, tier, status, overdueOnly, q]);
  const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;
  const due = (d?: number) => (d === undefined ? "" : d < 0 ? t("counsellor.overdueBy").replace("{n}", String(-d)) : d === 0 ? t("counsellor.today") : t("counsellor.inDays").replace("{n}", String(d)));
  const current = rows.find((r) => r.id === sel);

  return (
    <section className="space-y-6">
      <PageHeader title={t("counsellor.title")} lead={t("counsellor.lead")} />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t("counsellor.workload")}>
        {[[t("counsellor.open"), count((r) => r.status !== "closed")], [t("tier.3"), count((r) => r.tier === 3 && r.status !== "closed")],
          [t("counsellor.waiting"), count((r) => r.status === "awaiting_counsellor")], [t("next.overdue"), count((r) => (r.due_days ?? 0) < 0 && r.status !== "closed")]].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-line bg-surface px-4 py-3">
            <dt className="text-xs text-muted">{k}</dt><dd className="text-2xl font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="card-flush">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <label className="relative block min-w-[10rem] flex-1">
            <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="field ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("counsellor.search")} aria-label={t("counsellor.search")} />
          </label>
          <div role="group" aria-label={t("counsellor.tier")} className="seg">
            {[0, 3, 2, 1].map((x) => <button key={x} aria-pressed={tier === x} onClick={() => setTier(x)}>{x === 0 ? t("counsellor.all") : `${t("counsellor.tier")} ${x}`}</button>)}
          </div>
          <select className="field w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("counsellor.status")}>
            <option value="">{t("counsellor.status")}: {t("counsellor.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{td(`status.${s}`)}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--b600))]" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />{t("next.overdue")}</label>
        </div>
        <div className="max-h-[22rem] overflow-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="sticky top-0 bg-sunk text-xs text-muted">
              <tr>{["counsellor.case", "counsellor.tier", "counsellor.status", "counsellor.language", "counsellor.due"].map((k) => <th key={k} className="px-4 py-2 text-start font-semibold">{t(k)}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} onClick={() => setSel(r.id)} aria-selected={sel === r.id} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(r.id)}
                  className={`cursor-pointer border-t border-line transition-colors hover:bg-brand-50 ${sel === r.id ? "bg-brand-50" : ""}`}>
                  <td className="px-4 py-2.5 font-medium tabular-nums" dir="ltr">{r.id}</td>
                  <td className="px-4 py-2.5"><TierChip tier={r.tier} /></td>
                  <td className="px-4 py-2.5">{td(`status.${r.status}`)}</td>
                  <td className="px-4 py-2.5 text-muted">{(r.language ?? "").toUpperCase()} · {t(`level.${r.reading_level ?? "standard"}_short`)}</td>
                  <td className={`px-4 py-2.5 ${(r.due_days ?? 0) < 0 && r.status !== "closed" ? "font-semibold text-unsure-fg" : "text-muted"}`}>{r.status === "closed" ? "—" : due(r.due_days)}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">{t("palette.none")}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">{shown.length} / {rows.length}</p>
      </div>

      {current && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold" dir="ltr">{current.id}</h2><TierChip tier={current.tier} /></div>
          <div className="card">
            <h3 className="mb-3 font-semibold">{t("counsellor.brief")}</h3>
            <ul className="list-disc space-y-1 ps-5">{brief.data?.map((b, i) => <li key={i}>{brief_(b)}</li>)}</ul>
          </div>
          {sel === "demo-case" && (
            <>
              <div className="card flex flex-wrap items-center gap-2">
                <h3 className="me-auto font-semibold">{t("counsellor.decision")}</h3>
                <button className="btn" onClick={() => decide.mutate("approve")}><Check aria-hidden className="h-4 w-4" />{t("counsellor.approve")}</button>
                <button className="btn-quiet" onClick={() => decide.mutate("edit")}><Pencil aria-hidden className="h-4 w-4" />{t("counsellor.edit")}</button>
                <button className="btn-quiet" onClick={() => decide.mutate("hold")}><Pause aria-hidden className="h-4 w-4" />{t("counsellor.hold")}</button>
              </div>
              <div className="card space-y-4">
                <h3 className="font-semibold">{t("counsellor.referral")}</h3>
                <Journey current={steps.data?.[steps.data.length - 1]?.state ?? "result_released"} overdue={steps.data?.[steps.data.length - 1]?.overdue} />
                <label className="block text-sm font-medium">
                  <span className="block">{t("counsellor.evidence")}</span>
                  <input className="field mt-1 max-w-sm" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
                </label>
                <div className="flex flex-wrap gap-2">{STATES.map((s) => <button key={s} className="btn-quiet btn-sm" onClick={() => event.mutate(s)}>{td(`state.${s}`)}</button>)}</div>
                {err && <div role="alert"><Notice>{err}</Notice></div>}
              </div>
            </>
          )}
          {sel !== "demo-case" && <Notice>{t("counsellor.sampleOnly")}</Notice>}
        </div>
      )}
    </section>
  );
}
