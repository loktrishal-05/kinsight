"use client";
import { useQuery } from "@tanstack/react-query";
import { Ban, Check, KeyRound, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Cell = "yes" | "ask" | "no";
// Mirrors the consent policy (services/consent/policy.py ROLE_RESOURCES and scopes): default deny.
const ROLES = ["you", "partner", "counsellor", "relative", "analyst", "auditor"] as const;
const MATRIX: [string, Cell[]][] = [
  ["p.result", ["yes", "no", "ask", "no", "no", "no"]],
  ["p.couple", ["ask", "ask", "ask", "no", "no", "no"]],
  ["p.pedigree", ["yes", "no", "ask", "ask", "no", "no"]],
  ["p.quiz", ["yes", "no", "ask", "no", "no", "no"]],
  ["p.totals", ["no", "no", "no", "no", "yes", "no"]],
  ["p.audit", ["yes", "no", "no", "no", "no", "yes"]],
];

function Mark({ v }: { v: Cell }) {
  const { t } = useI18n();
  const m = { yes: [Check, "bg-brand-50 text-brand-800", t("privacy.yes")], ask: [KeyRound, "bg-found-bg text-found-fg", t("privacy.ask")], no: [Ban, "bg-clear-bg text-clear-fg", t("privacy.no")] }[v] as [typeof Check, string, string];
  const Icon = m[0];
  return <span className={`chip ${m[1]}`}><Icon aria-hidden className="h-3.5 w-3.5" /><span className="hidden sm:inline">{m[2]}</span><span className="sr-only sm:hidden">{m[2]}</span></span>;
}

export default function Privacy() {
  const { t, lang } = useI18n();
  const log = useQuery({ queryKey: ["accesslog"], queryFn: api.accessLog });
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const date = (s: number) => new Date(s * 1000).toLocaleString(lang === "ar" ? "ar-AE-u-nu-latn" : lang, { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className="space-y-6">
      <PageHeader title={t("privacy.title")} lead={t("privacy.lead")} />
      <div className="card-flush overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-sunk text-xs text-muted">
            <tr><th className="px-5 py-3 text-start font-semibold">{t("privacy.data")}</th>{ROLES.map((r) => <th key={r} className="px-2 py-3 text-center font-semibold">{t(`privacy.r.${r}`)}</th>)}</tr>
          </thead>
          <tbody>
            {MATRIX.map(([k, cells]) => (
              <tr key={k} className="border-t border-line">
                <th scope="row" className="px-5 py-3 text-start font-medium">{t(`privacy.${k}`)}</th>
                {cells.map((c, i) => <td key={i} className="px-2 py-3 text-center"><Mark v={c} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="max-w-read text-sm text-muted">{t("privacy.never")}</p>

      <div className="card">
        <h2 className="mb-1 text-lg font-semibold">{t("privacy.log")}</h2>
        <p className="mb-3 text-sm text-muted">{t("privacy.logNote")}</p>
        <ul>{log.data?.map((e, i) => (
          <li key={i} className="row flex-wrap items-start">
            <span><span className="font-medium">{e.who}</span> · {e.what}<br /><span className="text-xs text-muted">{e.outcome}</span></span>
            <span className="text-xs text-muted tabular-nums">{date(e.when)}</span>
          </li>
        ))}</ul>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">{t("privacy.controls")}</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/consents" className="btn-quiet">{t("nav.consents")}</Link>
          {!confirm && !done && <button className="btn-quiet" onClick={() => setConfirm(true)}><Trash2 aria-hidden className="h-4 w-4" />{t("privacy.delete")}</button>}
        </div>
        {confirm && !done && (
          <div className="space-y-3" role="alertdialog" aria-label={t("privacy.delete")}>
            <Notice>{t("privacy.deleteWarn")}</Notice>
            <div className="flex gap-2">
              <button className="btn" onClick={() => { api.resetDemo(); setDone(true); setConfirm(false); }}>{t("privacy.deleteYes")}</button>
              <button className="btn-quiet" onClick={() => setConfirm(false)}>{t("privacy.deleteNo")}</button>
            </div>
          </div>
        )}
        {done && <Notice>{t("privacy.deleted")}</Notice>}
      </div>
    </section>
  );
}
