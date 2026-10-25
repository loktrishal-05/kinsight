"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATES = ["counselling_done", "confirmatory_requested", "confirmatory_done", "specialist_referral_requested", "specialist_referral_done", "closed"];

export default function Counsellor() {
  const { t } = useI18n();
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
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("counsellor.title")}</h1>
      <div className="card">
        <h2 className="mb-2 font-medium">{t("counsellor.queue")}</h2>
        <ul className="space-y-1">
          {queue.data?.map((c) => (
            <li key={c.id}><button className={sel === c.id ? "btn" : "btn-quiet"} onClick={() => setSel(c.id)}>Tier {c.tier} · {c.id} · {c.status}</button></li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2 className="mb-2 font-medium">{t("counsellor.brief")}</h2>
        <ul className="list-disc ps-5">{brief.data?.map((b, i) => <li key={i}>{b}</li>)}</ul>
      </div>
      <div className="card flex flex-wrap items-center gap-2">
        <h2 className="me-2 font-medium">{t("counsellor.decision")}</h2>
        <button className="btn" onClick={() => decide.mutate("approve")}>{t("counsellor.approve")}</button>
        <button className="btn-quiet" onClick={() => decide.mutate("edit")}>{t("counsellor.edit")}</button>
        <button className="btn-quiet" onClick={() => decide.mutate("hold")}>{t("counsellor.hold")}</button>
      </div>
      <div className="card space-y-2">
        <h2 className="font-medium">{t("counsellor.referral")}</h2>
        <ol>{steps.data?.map((s, i) => <li key={i}>{s.state}{s.overdue && <strong className="ms-2">{t("next.overdue")}</strong>}</li>)}</ol>
        <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={evidence} onChange={(e) => setEvidence(e.target.value)} aria-label="evidence" placeholder="evidence code" />
        <div className="flex flex-wrap gap-2">{STATES.map((s) => <button key={s} className="btn-quiet" onClick={() => event.mutate(s)}>{s}</button>)}</div>
        {err && <p role="alert" className="note">{err}</p>}
      </div>
    </section>
  );
}
