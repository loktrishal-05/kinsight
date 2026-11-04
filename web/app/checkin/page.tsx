"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Notice, PageHeader } from "@/components/ui";
import { api, MOCK } from "@/lib/api";
import type { CheckinRequest } from "@/lib/safety";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function Checkin() {
  const { t } = useI18n();
  const { persona } = useSession();
  if (persona !== "person_a" && persona !== "person_b" && persona !== "demo_operator") return <Notice>{t("safety.personRestricted")}</Notice>;
  return <CheckinCards key={persona} />;
}

function CheckinCards() {
  const { t } = useI18n();
  const [instrument, setInstrument] = useState<CheckinRequest["instrument"]>("dcs");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [total, setTotal] = useState("");
  const [pin, setPin] = useState("");
  const [secondPin, setSecondPin] = useState("");
  const [unlockPin, setUnlockPin] = useState("");
  const [contact, setContact] = useState("");
  const [family, setFamily] = useState("HBB");
  const checkin = useMutation({ mutationFn: () => api.checkin({ instrument, answers: instrument === "pagis" ? null : Array.from({ length: instrument === "dcs" ? 16 : 10 }, (_, i) => instrument === "dcs" ? Number(answers[i]) : answers[i]), total: instrument === "pagis" ? Number(total) : null }) });
  const vault = useMutation({ mutationFn: () => api.safeVault({ pin, decoy_pin: secondPin }), onSuccess: () => { setPin(""); setSecondPin(""); unlock.reset(); setUnlockPin(""); } });
  const unlock = useMutation({ mutationFn: () => api.unlockVault({ pin: unlockPin }), onSuccess: () => setUnlockPin("") });
  const whisper = useMutation({ mutationFn: () => api.whisper({ contact, gene_family: family }), onSuccess: () => setContact("") });
  return <section className="space-y-6">
    <PageHeader title={t("safety.checkinTitle")} />
    {MOCK && <Notice>{t("safety.demo")}</Notice>}
    {[checkin, vault, unlock, whisper].some((m) => m.isError) && <p role="alert" className="note">{t("safety.error")}</p>}
    <section className="card space-y-4" aria-labelledby="checkin-title">
      <h2 id="checkin-title" className="text-lg font-semibold">{t("safety.checkin")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); checkin.mutate(); }}>
        <label className="block" htmlFor="instrument">{t("safety.instrument")}<select id="instrument" className="field mt-1" value={instrument} onChange={(e) => { setInstrument(e.target.value as CheckinRequest["instrument"]); setAnswers({}); setTotal(""); checkin.reset(); }}>
          {["dcs", "low_literacy_dcs", "pagis"].map((v) => <option value={v} key={v}>{t(`safety.${v}`)}</option>)}
        </select></label>
        <p className="text-sm text-muted">{t("safety.licensed")}</p>
        {instrument === "pagis" ? <label className="block" htmlFor="adjustment-total">{t("safety.total")}<input id="adjustment-total" className="field mt-1" type="number" min="0" step="any" required value={total} onChange={(e) => { setTotal(e.target.value); checkin.reset(); }} /></label> :
          <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: instrument === "dcs" ? 16 : 10 }, (_, i) => <label key={i} htmlFor={`item-${i}`}>{t("safety.item")} {i + 1}<select id={`item-${i}`} className="field mt-1" required value={answers[i] ?? ""} onChange={(e) => { setAnswers({ ...answers, [i]: e.target.value }); checkin.reset(); }}>
            <option value="" disabled>{t("safety.choose")}</option>
            {(instrument === "dcs" ? ["0", "1", "2", "3", "4"] : ["yes", "unsure", "no"]).map((v) => <option key={v} value={v}>{instrument === "dcs" ? v : t(`safety.${v}`)}</option>)}
          </select></label>)}</div>}
        <button className="btn-quiet" disabled={checkin.isPending}>{t("safety.submitCheckin")}</button>
      </form>
      {checkin.data && <div role="status"><p>{t("safety.score")}: <bdi>{checkin.data.score}</bdi></p>{checkin.data.flagged && checkin.data.support_offered && <p>{t("safety.support")}</p>}</div>}
    </section>
    <section className="card space-y-4" aria-labelledby="vault-title">
      <h2 id="vault-title" className="text-lg font-semibold">{t("safety.vault")}</h2>
      <p>{t("safety.vaultPurpose")}</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); unlock.reset(); vault.mutate(); }}>
        <p className="text-sm text-muted">{t("safety.pinHelp")}</p>
        <label className="block" htmlFor="vault-pin">{t("safety.pin")}<input id="vault-pin" className="field mt-1" type="password" dir="ltr" inputMode="numeric" pattern="[0-9]{4,12}" maxLength={12} autoComplete="new-password" required value={pin} onChange={(e) => { setPin(e.target.value); vault.reset(); }} /></label>
        <label className="block" htmlFor="second-pin">{t("safety.secondPin")}<input id="second-pin" className="field mt-1" type="password" dir="ltr" inputMode="numeric" pattern="[0-9]{4,12}" maxLength={12} autoComplete="new-password" required value={secondPin} onChange={(e) => { setSecondPin(e.target.value); vault.reset(); }} /></label>
        <button className="btn-quiet" disabled={vault.isPending || unlock.isPending}>{t("safety.savePins")}</button>
      </form>
      {vault.isSuccess && <p role="status">{t("safety.pinsSaved")}</p>}
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); unlock.reset(); unlock.mutate(); }}>
        <label className="block" htmlFor="unlock-pin">{t("safety.unlockPin")}<input id="unlock-pin" className="field mt-1" type="password" dir="ltr" inputMode="numeric" pattern="[0-9]{4,12}" maxLength={12} autoComplete="off" required value={unlockPin} onChange={(e) => { setUnlockPin(e.target.value); unlock.reset(); }} /></label>
        <button className="btn-quiet" disabled={unlock.isPending || vault.isPending}>{t("safety.unlock")}</button>
      </form>
      {unlock.data && <div role="status"><p>{t(unlock.data.view === "real" ? "safety.summary" : "safety.standard")}</p></div>}
      <button className="btn-quiet" disabled={unlock.isPending} onClick={() => { unlock.reset(); setUnlockPin(""); }}>{t("safety.lock")}</button>
    </section>
    <section className="card space-y-4" aria-labelledby="whisper-title">
      <h2 id="whisper-title" className="text-lg font-semibold">{t("safety.whisper")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); whisper.mutate(); }}>
        <label className="block" htmlFor="contact">{t("safety.contact")}<input id="contact" className="field mt-1" type="tel" dir="ltr" required pattern="[+0-9 ()-]{7,20}" value={contact} onChange={(e) => { setContact(e.target.value); whisper.reset(); }} /></label>
        <label className="block" htmlFor="gene-family">{t("safety.geneFamily")}<select id="gene-family" className="field mt-1" value={family} onChange={(e) => { setFamily(e.target.value); whisper.reset(); }}>{["HBB", "CFTR", "SMN1"].map((g) => <option key={g}>{g}</option>)}</select></label>
        <button className="btn-quiet" disabled={whisper.isPending}>{t("safety.queue")}</button>
      </form>
      {whisper.isSuccess && <p role="status">{t("safety.queued")}</p>}
    </section>
  </section>;
}
