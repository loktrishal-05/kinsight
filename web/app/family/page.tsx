"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Printer, UserPlus, UserX } from "lucide-react";
import { useState } from "react";
import Pedigree from "@/components/Pedigree";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { TALK_STARTERS } from "@/lib/learn";

export default function Family() {
  const { t, lang } = useI18n();
  const l = lang === "ar" ? "ar" : "en";
  const qc = useQueryClient();
  const [copied, setCopied] = useState("");
  const ped = useQuery({ queryKey: ["pedigree"], queryFn: api.pedigree });
  const invite = useMutation({ mutationFn: api.invite, onSuccess: () => qc.invalidateQueries() });
  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 1800); } catch { /* clipboard blocked */ }
  };
  return (
    <section className="space-y-6">
      <PageHeader title={t("family.title")} lead={t("family.lead")} />
      <Notice>{t("family.hint")}</Notice>
      <div className="card overflow-x-auto" data-demo="pedigree">{ped.data && <Pedigree data={ped.data} />}</div>
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">{t("family.invite")}</h2>
          <p className="text-sm text-muted">{t("consent.scope")}: {t("scope.couple_tier_only")}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" data-demo="invite" onClick={() => invite.mutate("couple_tier_only")}><UserPlus aria-hidden className="h-4 w-4" />{t("family.invite")}</button>
          <button className="btn-quiet" onClick={() => invite.mutate("decline")}><UserX aria-hidden className="h-4 w-4" />{t("family.decline")}</button>
        </div>
      </div>

      <div className="card space-y-4" data-demo="toolkit">
        <div>
          <h2 className="text-lg font-semibold">{t("toolkit.title")}</h2>
          <p className="text-sm text-muted">{t("toolkit.lead")}</p>
        </div>
        <ul className="divide-y divide-line">
          {TALK_STARTERS.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 py-3">
              <p className="max-w-read">{s.text[l]}</p>
              <button className="btn-quiet btn-sm shrink-0" onClick={() => copy(s.id, s.text[l])}>
                {copied === s.id ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}{copied === s.id ? t("toolkit.copied") : t("toolkit.copy")}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card space-y-3" id="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("toolkit.card")}</h2>
          <button className="btn-quiet btn-sm" data-noprint onClick={() => window.print()}><Printer aria-hidden className="h-3.5 w-3.5" />{t("summary.print")}</button>
        </div>
        <div className="rounded-xl border border-dashed border-line bg-sunk p-5">
          <p className="font-semibold">{t("toolkit.cardTitle")}</p>
          <p className="mt-1 max-w-read text-sm">{t("toolkit.cardBody")}</p>
          <p className="mt-3 text-xs text-muted">{t("toolkit.cardNote")}</p>
        </div>
      </div>
    </section>
  );
}
