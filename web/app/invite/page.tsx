"use client";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { conditionLabel } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";

// A relative opens a family invite. It names one condition and nothing about the person who sent it.
export default function Invite() {
  const { t, lang } = useI18n();
  const [token, setToken] = useState("");
  const redeem = useMutation({ mutationFn: () => api.redeemCascade(token.trim()) });
  const outcome = useMutation({ mutationFn: (o: "tested" | "declined") => api.cascadeOutcome(redeem.data!.follow_up!, o) });
  return (
    <section className="space-y-6">
      <PageHeader title={t("invite.title")} lead={t("invite.lead")} />
      <form className="card space-y-3" onSubmit={(e) => { e.preventDefault(); redeem.mutate(); }}>
        <label htmlFor="family-token" className="block">{t("lifecycle.open")}
          <input id="family-token" className="field mt-1" required value={token} onChange={(e) => { setToken(e.target.value); redeem.reset(); outcome.reset(); }} /></label>
        <button className="btn-quiet" disabled={redeem.isPending}>{t("lifecycle.redeem")}</button>
      </form>
      {redeem.isError && <p role="alert" className="note">{t("invite.unavailable")}</p>}
      {redeem.isSuccess && <div role="status" className="card space-y-3" data-demo="invite-opened">
        <h2 className="text-lg font-semibold">{conditionLabel(redeem.data.condition_id.toUpperCase(), lang)}</h2>
        <Notice>{t("cascade.relativeNote")}</Notice>
        <div className="flex flex-wrap gap-2"><Link className="btn-quiet btn-sm" href="/learn">{t("nav.learn")}</Link><Link className="btn-quiet btn-sm" href="/access">{t("nav.access")}</Link></div>
        {redeem.data.follow_up && (outcome.isSuccess ? <p>{t("cascade.thanks")}</p> : <div className="flex flex-wrap gap-2">
          <button className="btn-quiet btn-sm" onClick={() => outcome.mutate("tested")}>{t("cascade.iTested")}</button>
          <button className="btn-quiet btn-sm" onClick={() => outcome.mutate("declined")}>{t("cascade.iDeclined")}</button></div>)}
      </div>}
    </section>
  );
}
