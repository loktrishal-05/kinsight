"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Governance() {
  const { t } = useI18n();
  const [valid, setValid] = useState<boolean | null>(null);
  const policy = useQuery({ queryKey: ["policy"], queryFn: api.policy });
  const sources = useQuery({ queryKey: ["sources"], queryFn: api.sources });
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("gov.title")}</h1>
      <p className="note">{t("gov.intended")}</p>
      <div className="card space-y-2">
        <div className="flex gap-2">
          <button className="btn" onClick={async () => setValid((await api.auditVerify(false)).valid)}>{t("gov.verify")}</button>
          <button className="btn-quiet" onClick={async () => setValid((await api.auditVerify(true)).valid)}>{t("gov.tamper")}</button>
        </div>
        {valid !== null && <p role="status" data-testid="chain">{valid ? "Chain valid" : "Chain broken: tampering detected"}</p>}
      </div>
      <div className="card"><ul className="list-disc ps-5">{policy.data?.rules?.map((r: string) => <li key={r}>{r}</li>)}</ul></div>
      <div className="card"><ul>{sources.data?.map((s: any) => <li key={s.source}>{s.source} · {s.licence} · {s.kind}</li>)}</ul></div>
      <p className="text-xs">{t("limits")}</p>
    </section>
  );
}
