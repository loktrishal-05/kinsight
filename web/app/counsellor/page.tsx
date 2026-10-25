"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pause, Pencil } from "lucide-react";
import { useState } from "react";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATES = ["counselling_done", "confirmatory_requested", "confirmatory_done", "specialist_referral_requested", "specialist_referral_done", "closed"];

export default function Counsellor() {
  const { t, td } = useI18n();
  const brief_ = (b: string) => (b.startsWith("finding_") ? `${t("brief.finding")} ${b.slice(8)}` : td(`brief.${b}`));
  const qc = useQueryClient();
  const [sel, setSel] = useState("demo-case");
  const [evidence, setEvidence] = useState("");
  const [err, setErr] = useState("");
  const queue = useQuery({ queryKey: ["queue"], queryFn: api.queue });
  const brief = useQuery({ queryKey: ["brief", sel], queryFn: () => api.brief(sel) });
  const steps = useQuery({ queryKey: ["referral"], queryFn: api.referral });
  const decide = useMutation({ mutationFn: (d: string) => api.decide(sel, d), onSuccess: () => qc.invalidateQueries() });
  const event = useMutation({
    mutationFn: (e: string) => api.referralEvent(sel, e, evidence),
    onSuccess: () => { setErr(""); qc.invalidateQueries(); },
    onError: () => setErr(t("counsellor.closureNeeds")),
  });
  return (
    <section className="space-y-6">
      <PageHeader title={t("counsellor.title")} lead={t("counsellor.lead")} />
      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="card-flush self-start">
          <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">{t("counsellor.queue")}</h2>
          <ul>
            {queue.data?.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSel(c.id)} aria-pressed={sel === c.id}
                  className={`w-full px-5 py-3 text-start transition-colors hover:bg-brand-50 ${sel === c.id ? "bg-brand-50" : ""}`}>
                  <span className="block font-medium">{t("counsellor.case")} · {c.id}</span>
                  <span className="text-xs text-muted">{t("counsellor.tier")} {c.tier} · {td(`status.${c.status}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 text-lg font-semibold">{t("counsellor.brief")}</h2>
            <ul className="list-disc space-y-1 ps-5">{brief.data?.map((b, i) => <li key={i}>{brief_(b)}</li>)}</ul>
          </div>
          <div className="card flex flex-wrap items-center gap-2">
            <h2 className="me-auto text-lg font-semibold">{t("counsellor.decision")}</h2>
            <button className="btn" onClick={() => decide.mutate("approve")}><Check aria-hidden className="h-4 w-4" />{t("counsellor.approve")}</button>
            <button className="btn-quiet" onClick={() => decide.mutate("edit")}><Pencil aria-hidden className="h-4 w-4" />{t("counsellor.edit")}</button>
            <button className="btn-quiet" onClick={() => decide.mutate("hold")}><Pause aria-hidden className="h-4 w-4" />{t("counsellor.hold")}</button>
          </div>
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">{t("counsellor.referral")}</h2>
            <ol className="space-y-1">
              {steps.data?.map((s, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{td(`state.${s.state}`)}</span>
                  {s.overdue && <span className="chip bg-unsure-bg text-unsure-fg">{t("next.overdue")}</span>}
                </li>
              ))}
            </ol>
            <label className="block text-sm font-medium">
              <span className="block">{t("counsellor.evidence")}</span>
              <input className="field mt-1 max-w-sm" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              {STATES.map((s) => <button key={s} className="btn-quiet btn-sm" onClick={() => event.mutate(s)}>{td(`state.${s}`)}</button>)}
            </div>
            {err && <div role="alert"><Notice>{err}</Notice></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
