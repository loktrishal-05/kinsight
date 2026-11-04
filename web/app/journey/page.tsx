"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Notice, PageHeader } from "@/components/ui";
import { api, MOCK } from "@/lib/api";
import { DATA, conditionLabel } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function Journey() {
  const { t } = useI18n();
  const { persona } = useSession();
  if (persona !== "person_a" && persona !== "person_b" && persona !== "demo_operator") return <Notice>{t("lifecycle.restricted")}</Notice>;
  return <JourneyCards key={persona} persona={persona} />;
}

function JourneyCards({ persona }: { persona: string }) {
  const { t, td, lang } = useI18n();
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [pair, setPair] = useState<{ id: string; pin: string; expires_in: number } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pin, setPin] = useState("");
  const [condition, setCondition] = useState(DATA.cohort.carriers[0].condition_id);
  const [token, setToken] = useState("");
  const tracker = useQuery({ queryKey: ["journey", persona, "tracker"], queryFn: api.tracker });
  const certificate = useQuery({ queryKey: ["journey", persona, "certificate", elapsed], queryFn: () => api.certificate(elapsed) });
  const receipt = useQuery({ queryKey: ["journey", persona, "receipt"], queryFn: api.receipt });
  const status = useQuery({ queryKey: ["journey", persona, "pairing", pair?.id], queryFn: () => api.pairing(pair!.id), enabled: !!pair, refetchInterval: 1000 });
  const advance = useMutation({ mutationFn: api.advanceTracker, onSuccess: (data) => qc.setQueryData(["journey", persona, "tracker"], data) });
  const start = useMutation({ mutationFn: api.startPairing, onSuccess: (data) => { setPair(data); setRemaining(data.expires_in); setPin(""); } });
  const confirm = useMutation({ mutationFn: () => api.confirmPairing(pair!.id, pin), onSuccess: (data) => qc.setQueryData(["journey", persona, "pairing", pair!.id], data) });
  const revoke = useMutation({ mutationFn: () => api.revokePairing(pair!.id), onSuccess: (data) => qc.setQueryData(["journey", persona, "pairing", pair!.id], data) });
  const create = useMutation({ mutationFn: () => api.cascade(condition) });
  const redeem = useMutation({ mutationFn: () => api.redeemCascade(token.trim()) });
  useEffect(() => {
    if (!pair) return;
    const timer = window.setInterval(() => setRemaining((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [pair]);
  const error = [tracker, certificate, receipt, status, advance, start, confirm, revoke, create, redeem].some((q) => q.isError);
  return <section className="space-y-6">
    <PageHeader title={t("lifecycle.title")} />
    {MOCK && <Notice>{t("lifecycle.demo")}</Notice>}
    {error && <p role="alert" className="note">{t("lifecycle.error")}</p>}
    {[tracker, certificate, receipt].some((q) => q.isPending) && <p role="status">{t("lifecycle.loading")}</p>}
    <section className="card space-y-4" aria-labelledby="lab-title">
      <h2 id="lab-title" className="text-lg font-semibold">{t("lifecycle.lab")}</h2>
      <ol className="space-y-2">
        {tracker.data?.stages.map((stage, i) => <li key={stage} aria-current={tracker.data.stage === i + 1 ? "step" : undefined}
          className={`border-s-4 py-2 ps-4 ${tracker.data.stage === i + 1 ? "border-brand-600 bg-brand-50 font-semibold text-brand-800" : "border-line"}`}>
          <span>{i + 1}. {td(`lifecycle.stage.${stage}`)}</span>
          {tracker.data.times[stage] != null && <time className="block text-sm text-muted" dateTime={new Date(tracker.data.times[stage] * 1000).toISOString()}>{new Date(tracker.data.times[stage] * 1000).toLocaleString(lang)}</time>}
        </li>)}
      </ol>
      {tracker.data?.qc_failure && <p role="status">{t("lifecycle.qc")}: {tracker.data.qc_failure}</p>}
      {MOCK && <button className="btn-quiet" disabled={!tracker.data || tracker.data.stage === 8 || advance.isPending} onClick={() => advance.mutate()}>{t("lifecycle.advance")}</button>}
    </section>
    <section className="card space-y-4" aria-labelledby="certificate-title">
      <h2 id="certificate-title" className="text-lg font-semibold">{t("lifecycle.certificate")}</h2>
      {certificate.data?.locked && <div role="status"><p>{t("plan.locked")}</p><p>{t("plan.unlockNote")}</p><Link className="btn-quiet" href="/understand">{t("plan.understand")}</Link></div>}
      {certificate.data && !certificate.data.locked && <>
        <p>{certificate.data.days_left} / 90 {t("lifecycle.days")}</p>
        <progress className="h-3 w-full accent-brand-600" max={90} value={certificate.data.days_left} aria-label={t("lifecycle.days")} />
        <p role="status">{certificate.data.expired ? t("lifecycle.expired") : certificate.data.alert_at ? t(`lifecycle.alert.${certificate.data.alert_at}`) : null}</p>
      </>}
      <Notice>{t("lifecycle.permanent")}</Notice>
      {MOCK && <label className="block" htmlFor="elapsed">{t("lifecycle.elapsed")}: {elapsed}<input id="elapsed" type="range" min="0" max="120" value={elapsed} onChange={(e) => setElapsed(Number(e.target.value))} className="block w-full accent-brand-600" /></label>}
    </section>
    <section className="card space-y-4" aria-labelledby="pairing-title">
      <h2 id="pairing-title" className="text-lg font-semibold">{t("lifecycle.pairing")}</h2>
      <button className="btn-quiet" disabled={start.isPending || status.data?.status === "active" || status.data?.status === "pending"} onClick={() => start.mutate()}>{t("lifecycle.start")}</button>
      {pair && <>
        <p role="status"><span className="chip bg-clear-bg text-clear-fg">{t(`lifecycle.status.${status.data?.status ?? "pending"}`)}</span></p>
        {(!status.data || status.data.status === "pending") && <>
          <p>{t("lifecycle.pin")}: <bdi className="font-mono" dir="ltr">{pair.pin}</bdi></p>
          <p>{t("lifecycle.countdown")}: <bdi dir="ltr">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</bdi></p>
        </>}
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); confirm.mutate(); }}>
          <label htmlFor="pair-pin">{t("lifecycle.enterPin")}<input id="pair-pin" className="field mt-1" dir="ltr" inputMode="numeric" pattern="[0-9]{9}" maxLength={9} required value={pin} onChange={(e) => setPin(e.target.value)} /></label>
          <button className="btn-quiet" disabled={confirm.isPending || remaining === 0 || status.data?.status !== "pending"}>{t("lifecycle.confirm")}</button>
        </form>
        <button className="btn-quiet" disabled={revoke.isPending || status.data?.status === "revoked" || status.data?.status === "expired"} onClick={() => revoke.mutate()}>{t("lifecycle.stop")}</button>
      </>}
    </section>
    <section className="card space-y-4" aria-labelledby="receipt-title">
      <h2 id="receipt-title" className="text-lg font-semibold">{t("lifecycle.receipt")}</h2>
      <div className="overflow-x-auto"><table className="w-full text-start text-sm">
        <caption className="mb-3 text-start text-muted">{t("lifecycle.privateReceipt")}</caption>
        <thead><tr>{["label", "gross", "insurer", "grant", "copay"].map((key) => <th className="p-2 text-start" key={key} scope="col">{t(`lifecycle.${key}`)}</th>)}</tr></thead>
        <tbody>{receipt.data?.lines.map((line, i) => <tr key={i}><th scope="row" className="p-2 text-start">{td(line.label)}</th>{[line.gross, line.insurer, line.grant, line.copay].map((amount, j) => <td className="p-2 tabular-nums" dir="ltr" key={j}>{amount}</td>)}</tr>)}</tbody>
      </table></div>
      {receipt.data && <><p>{t("lifecycle.total")}: <bdi>{receipt.data.total}</bdi></p><p className="font-semibold">{t("lifecycle.share")}: <bdi>{receipt.data.your_share}</bdi></p></>}
    </section>
    <section className="card space-y-4" aria-labelledby="family-title">
      <h2 id="family-title" className="text-lg font-semibold">{t("lifecycle.family")}</h2>
      <label htmlFor="condition" className="block">{t("lifecycle.condition")}<select id="condition" className="field mt-1" value={condition} onChange={(e) => { setCondition(e.target.value); create.reset(); }}>{DATA.cohort.carriers.map((c) => <option key={c.condition_id} value={c.condition_id}>{conditionLabel(c.condition_id, lang)}</option>)}</select></label>
      <button className="btn-quiet" disabled={create.isPending} onClick={() => create.mutate()}>{t("lifecycle.create")}</button>
      <p className="text-sm text-muted">{t("lifecycle.once")}</p>
      {create.data && <p role="status"><bdi dir="ltr" className="break-all font-mono">{create.data.token}</bdi></p>}
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); redeem.mutate(); }}>
        <label htmlFor="family-token" className="block">{t("lifecycle.open")}<input id="family-token" className="field mt-1" required value={token} onChange={(e) => { setToken(e.target.value); redeem.reset(); }} /></label>
        <button className="btn-quiet" disabled={redeem.isPending}>{t("lifecycle.redeem")}</button>
      </form>
      {redeem.isSuccess && <p role="status">{conditionLabel(redeem.data.condition_id, lang)}</p>}
    </section>
  </section>;
}
