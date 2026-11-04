"use client";
import Restricted from "@/components/Restricted";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Notice, PageHeader } from "@/components/ui";
import { api, MOCK } from "@/lib/api";
import { TRIAGE_PRESETS, geneCall, triagePreset, type TriageRequest } from "@/lib/safety";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function Clinic() {
  const { t } = useI18n();
  const { persona } = useSession();
  if (persona !== "counsellor" && persona !== "demo_operator") return <Restricted text={t("safety.clinicRestricted")} />;
  return <ClinicCards key={persona} />;
}

function ClinicCards() {
  const { t, td } = useI18n();
  const [preset, setPreset] = useState<typeof TRIAGE_PRESETS[number]>("shared");
  const [form, setForm] = useState<TriageRequest>(triagePreset("shared"));
  const [genesA, setGenesA] = useState("HBB"), [genesB, setGenesB] = useState("HBB");
  const [rows, setRows] = useState("demo-v1 3 5\ndemo-v2 5 2");
  const [pairing, setPairing] = useState("demo-pair-1");
  const [role, setRole] = useState<"pcp" | "counsellor">("counsellor");
  const [first, setFirst] = useState(""), [second, setSecond] = useState(""), [reason, setReason] = useState("");
  const calls = (text: string, existing: TriageRequest["a"]) => text.split(",").map((g) => g.trim()).filter(Boolean).map((gene) => existing.find((g) => g.gene === gene) ?? geneCall(gene));
  const triage = useMutation({ mutationFn: () => api.triage({ ...form, a: calls(genesA, form.a), b: calls(genesB, form.b) }) });
  const reclassify = useMutation({ mutationFn: () => {
    const entries = rows.trim().split(/\r?\n/).map((row) => row.trim().split(/\s+/));
    if (entries.some((row) => row.length !== 3 || !row[0] || !/^[1-5]$/.test(row[1]) || !/^[1-5]$/.test(row[2])) || new Set(entries.map((r) => r[0])).size !== entries.length) throw new Error("422");
    return api.reclassify({ archived: Object.fromEntries(entries.map(([id, a]) => [id, Number(a)])), feed: Object.fromEntries(entries.map(([id, , b]) => [id, Number(b)])) });
  } });
  const live = useMutation({ mutationFn: () => {
    const entries = rows.trim().split(/\r?\n/).map((row) => row.trim().split(/\s+/));
    if (entries.some((row) => row.length < 2 || !/^\d+$/.test(row[0]) || !/^[1-5]$/.test(row[1]))) throw new Error("422");
    return api.reclassifyLive(Object.fromEntries(entries.map(([id, a]) => [id, Number(a)])));
  } });
  const [variant, setVariant] = useState("7-117559590-ATCT-A");
  const frequency = useMutation({ mutationFn: () => api.frequency(variant.trim().split(/\s*,\s*/).filter(Boolean)) });
  const pct = (x: number | null) => (x == null ? "–" : `${(x * 100).toFixed(2)}%`);
  const tamm = useMutation({ mutationFn: () => api.tamm({ pairing_ref: pairing, role }) });
  const emergency = useMutation({ mutationFn: () => api.breakGlass({ attestors: [first, second], reason }), onSuccess: () => setReason("") });
  return <section className="space-y-6">
    <PageHeader title={t("safety.clinicTitle")} />
    {MOCK && <Notice>{t("safety.demo")}</Notice>}
    {[triage, reclassify, live, frequency, tamm, emergency].some((m) => m.isError) && <p role="alert" className="note">{t("safety.error")}</p>}
    <section className="card space-y-4" aria-labelledby="triage-title">
      <h2 id="triage-title" className="text-lg font-semibold">{t("safety.triage")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); triage.mutate(); }}>
        <label className="block" htmlFor="triage-preset">{t("safety.preset")}<select id="triage-preset" className="field mt-1" value={preset} onChange={(e) => {
          const value = e.target.value as typeof preset, next = triagePreset(value); setPreset(value); setForm(next); setGenesA(next.a.map((g) => g.gene).join(", ")); setGenesB(next.b.map((g) => g.gene).join(", ")); triage.reset();
        }}>{TRIAGE_PRESETS.map((p) => <option key={p} value={p}>{t(`safety.preset.${p}`)}</option>)}</select></label>
        <p className="text-sm text-muted">{t("safety.geneHelp")}</p>
        <label className="block" htmlFor="genes-a">{t("safety.genesA")}<input id="genes-a" className="field mt-1" dir="ltr" value={genesA} onChange={(e) => { setGenesA(e.target.value); triage.reset(); }} /></label>
        <label className="block" htmlFor="genes-b">{t("safety.genesB")}<input id="genes-b" className="field mt-1" dir="ltr" value={genesB} onChange={(e) => { setGenesB(e.target.value); triage.reset(); }} /></label>
        <label className="block" htmlFor="phi">{t("safety.phi")}<input id="phi" className="field mt-1" type="number" min="0" max="0.5" step="any" required value={form.phi} onChange={(e) => { setForm({ ...form, phi: Number(e.target.value) }); triage.reset(); }} /></label>
        <label className="block" htmlFor="pregnancy-days">{t("safety.pregnancyDays")}<input id="pregnancy-days" className="field mt-1" type="number" min="0" value={form.pregnant_days ?? ""} onChange={(e) => { setForm({ ...form, pregnant_days: e.target.value === "" ? null : Number(e.target.value) }); triage.reset(); }} /></label>
        <label className="block" htmlFor="dcs">{t("safety.dcsScore")}<input id="dcs" className="field mt-1" type="number" min="0" max="100" step="any" value={form.dcs ?? ""} onChange={(e) => { setForm({ ...form, dcs: e.target.value === "" ? null : Number(e.target.value) }); triage.reset(); }} /></label>
        <button className="btn-quiet" disabled={triage.isPending}>{t("safety.runTriage")}</button>
      </form>
      {triage.data && <div role="status" className="space-y-2">
        <p>{t("safety.tier")}: {triage.data.tier}</p>
        <p>{t("safety.rules")}</p><ul>{triage.data.rules.map((r) => <li key={r}>{td(`safety.rule.${r}`)}</li>)}</ul>
        <p>{t("safety.sharedGenes")}: <bdi>{triage.data.shared_genes.join(", ") || t("safety.none")}</bdi></p>
        <p>{t("safety.chance")}: {t("safety.frequency").replace("{x}", String(triage.data.combined_risk_pct))}</p>
        <p>{t(triage.data.hold_release ? "safety.hold" : "safety.noHold")}</p>
        <p>{t("safety.hours")}: {triage.data.sla_hours ?? t("safety.none")}</p>
        <p>{t("safety.privateCounts")}: {triage.data.private_counts.a} / {triage.data.private_counts.b}</p>
      </div>}
    </section>
    <section className="card space-y-4" aria-labelledby="reclass-title">
      <h2 id="reclass-title" className="text-lg font-semibold">{t("safety.reclassify")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); reclassify.mutate(); }}>
        <label className="block" htmlFor="variant-rows">{t("safety.variantRows")}<textarea id="variant-rows" className="field mt-1" dir="ltr" rows={4} required value={rows} onChange={(e) => { setRows(e.target.value); reclassify.reset(); }} /></label>
        <button type="button" className="btn-quiet" onClick={() => { setRows("demo-v1 3 5\ndemo-v2 5 2"); reclassify.reset(); }}>{t("safety.sample")}</button>{" "}
        <button className="btn-quiet" disabled={reclassify.isPending}>{t("safety.compare")}</button>{" "}
        <button type="button" className="btn-quiet" disabled={live.isPending} onClick={() => { reclassify.reset(); live.mutate(); }}>{t("safety.live")}</button>
      </form>
      {live.data && <div role="status" aria-label="ClinVar"><p className="text-sm text-muted">NCBI ClinVar</p><ul>{live.data.alerts.map((a) => <li key={a.variant}><bdi>{a.variant}</bdi>: {a.from} → {a.to}, {t(`safety.${a.direction}`)} — {t("safety.review")}</li>)}</ul>{!live.data.alerts.length && <p>{t("safety.noAlerts")}</p>}</div>}
      {reclassify.data && <div role="status"><ul>{reclassify.data.alerts.map((a) => <li key={a.variant}><bdi>{a.variant}</bdi>: {a.from} → {a.to}, {t(`safety.${a.direction}`)}{a.needs_clinician_review && ` — ${t("safety.review")}`}</li>)}</ul>{!reclassify.data.alerts.length && <p>{t("safety.noAlerts")}</p>}</div>}
    </section>
    <section className="card space-y-4" aria-labelledby="freq-title">
      <h2 id="freq-title" className="text-lg font-semibold">{t("safety.freq")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); frequency.mutate(); }}>
        <label className="block" htmlFor="gnomad-variant">{t("safety.freqIds")}<input id="gnomad-variant" className="field mt-1" dir="ltr" required value={variant} onChange={(e) => { setVariant(e.target.value); frequency.reset(); }} /></label>
        <button className="btn-quiet" disabled={frequency.isPending}>{t("safety.freqGo")}</button>
      </form>
      {frequency.data && <div role="status" aria-label="gnomAD"><p className="text-sm text-muted">gnomAD v4 · {t("safety.freqNote")}</p><ul>{Object.entries(frequency.data.variants).map(([id, v]) => <li key={id}><bdi>{id}</bdi>: {v ? `${t("safety.freqCarrier")} ${pct(v.carrier_share)}; ${t("safety.freqMid")} ${pct(v.middle_eastern_carrier_share)} (n=${v.middle_eastern_allele_number})` : t("safety.freqNone")}</li>)}</ul></div>}
    </section>
    <section className="card space-y-4" aria-labelledby="tamm-title">
      <h2 id="tamm-title" className="text-lg font-semibold">{t("safety.tamm")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); tamm.mutate(); }}>
        <label className="block" htmlFor="pairing-ref">{t("safety.pairingRef")}<input id="pairing-ref" className="field mt-1" required value={pairing} onChange={(e) => { setPairing(e.target.value); tamm.reset(); }} /></label>
        <label className="block" htmlFor="signer-role">{t("safety.role")}<select id="signer-role" className="field mt-1" value={role} onChange={(e) => { setRole(e.target.value as typeof role); tamm.reset(); }}>{["pcp", "counsellor"].map((r) => <option key={r} value={r}>{t(`safety.${r}`)}</option>)}</select></label>
        <button className="btn-quiet" disabled={tamm.isPending}>{t("safety.issue")}</button>
      </form>
      <p>{t("safety.noResults")}</p>
      {tamm.data && <div role="status"><pre dir="ltr" className="overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(tamm.data, null, 2)}</pre></div>}
    </section>
    <section className="card space-y-4" aria-labelledby="emergency-title">
      <h2 id="emergency-title" className="text-lg font-semibold">{t("safety.emergency")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); emergency.mutate(); }}>
        <label className="block" htmlFor="clinician-one">{t("safety.clinicianOne")}<input id="clinician-one" className="field mt-1" required value={first} onChange={(e) => { setFirst(e.target.value); emergency.reset(); }} /></label>
        <label className="block" htmlFor="clinician-two">{t("safety.clinicianTwo")}<input id="clinician-two" className="field mt-1" required value={second} onChange={(e) => { setSecond(e.target.value); emergency.reset(); }} /></label>
        <label className="block" htmlFor="access-reason">{t("safety.reason")}<textarea id="access-reason" className="field mt-1" required value={reason} onChange={(e) => { setReason(e.target.value); emergency.reset(); }} /></label>
        <button className="btn-quiet" disabled={emergency.isPending}>{t("safety.requestAccess")}</button>
      </form>
      {emergency.data && <div role="status"><p>{t(emergency.data.granted ? "safety.granted" : "safety.denied")}</p>{emergency.data.alert_siem && <p>{t("safety.alertRaised")}</p>}{emergency.data.notify_citizen && <p>{t("safety.citizenNotified")}</p>}</div>}
    </section>
  </section>;
}
