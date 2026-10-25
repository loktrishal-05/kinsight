"use client";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Governance() {
  const { t } = useI18n();
  const [valid, setValid] = useState<boolean | null>(null);
  const policy = useQuery({ queryKey: ["policy"], queryFn: api.policy });
  const sources = useQuery({ queryKey: ["sources"], queryFn: api.sources });
  return (
    <section className="space-y-6">
      <PageHeader title={t("gov.title")} lead={t("gov.lead")} />
      <Notice>{t("gov.intended")}</Notice>
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-2">
          <button className="btn" data-demo="verify" onClick={async () => setValid((await api.auditVerify(false)).valid)}><ShieldCheck aria-hidden className="h-4 w-4" />{t("gov.verify")}</button>
          <button className="btn-quiet" data-demo="tamper" onClick={async () => setValid((await api.auditVerify(true)).valid)}><ShieldAlert aria-hidden className="h-4 w-4" />{t("gov.tamper")}</button>
        </div>
        {valid !== null && (
          <p role="status" data-testid="chain" data-valid={valid} className={`chip text-sm ${valid ? "bg-brand-50 text-brand-800" : "bg-unsure-bg text-unsure-fg"}`}>
            {valid ? "Chain valid" : "Chain broken: tampering detected"}
          </p>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-lg font-semibold">{t("gov.rules")}</h2>
          <ul className="list-disc space-y-1.5 ps-5 text-sm">{policy.data?.rules?.map((r: string) => <li key={r}>{r}</li>)}</ul>
        </div>
        <div className="card">
          <h2 className="mb-2 text-lg font-semibold">{t("gov.sources")}</h2>
          <ul className="space-y-1.5 text-sm">{sources.data?.map((s: any) => <li key={s.source}><span className="font-medium">{s.source}</span> <span className="text-muted">· {s.licence} · {s.kind}</span></li>)}</ul>
        </div>
      </div>
    </section>
  );
}
