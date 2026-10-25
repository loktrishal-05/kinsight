"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function CoupleView() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const couple = useQuery({ queryKey: ["couple"], queryFn: () => api.couple() });
  const grant = useMutation({ mutationFn: api.grantPooling, onSuccess: () => qc.invalidateQueries() });
  const c = couple.data;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("couple.title")}</h1>
      {!c?.tier && (
        <div className="card space-y-3">
          <p>{t("couple.waiting")}</p>
          <button className="btn" onClick={() => grant.mutate()}>{t("couple.pooling")}</button>
        </div>
      )}
      {c?.awaiting_counsellor && <p className="note" role="status">{t("couple.tier3")}</p>}
      {c?.findings?.map((f) => (
        <div key={f.condition_id} className="card">
          <p className="font-medium">{f.label ?? f.condition_id}</p>
          {f.risk_affected !== null ? (
            <p><span className="text-2xl">{Math.round(f.risk_affected * 100)}%</span> {t("couple.chance")}</p>
          ) : <p>{t("result.unclear")}</p>}
        </div>
      ))}
      {c?.tier === 3 && !c.awaiting_counsellor && <p className="note">{t("couple.tier3")}</p>}
      {c?.tier && <p className="note">{t("couple.uncertainty")}</p>}
    </section>
  );
}
