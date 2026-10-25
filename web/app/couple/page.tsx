"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Notice, PageHeader, Steps } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function CoupleView() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const couple = useQuery({ queryKey: ["couple"], queryFn: () => api.couple() });
  const grant = useMutation({ mutationFn: api.grantPooling, onSuccess: () => qc.invalidateQueries() });
  const c = couple.data;
  const step = !c?.tier ? 0 : c.awaiting_counsellor ? 1 : 2;
  return (
    <section className="space-y-6">
      <PageHeader title={t("couple.title")} lead={t("couple.lead")} />
      <Steps labels={[t("couple.s1"), t("couple.s2"), t("couple.s3")]} current={step} />
      {!c?.tier && (
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-read">{t("couple.waiting")}</p>
          <button className="btn" onClick={() => grant.mutate()}><Users aria-hidden className="h-4 w-4" />{t("couple.pooling")}</button>
        </div>
      )}
      {c?.awaiting_counsellor && <Notice>{t("couple.tier3")}</Notice>}
      {c?.findings?.map((f) => (
        <div key={f.condition_id} className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{lang === "ar" && f.label_ar ? f.label_ar : f.label ?? f.condition_id}</p>
            <p className="text-sm text-muted">{t("couple.chance")}</p>
          </div>
          {f.risk_affected !== null
            ? <p className="text-4xl font-bold tabular-nums text-brand-700" dir="ltr">{Math.round(f.risk_affected * 100)}%</p>
            : <p className="text-muted">{t("result.unclear")}</p>}
        </div>
      ))}
      {c?.tier === 3 && !c.awaiting_counsellor && <Notice>{t("couple.tier3")}</Notice>}
      {c?.tier && <p className="max-w-read text-sm text-muted">{t("couple.uncertainty")}</p>}
    </section>
  );
}
