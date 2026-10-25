"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Notice, PageHeader, Steps } from "@/components/ui";
import { IconArray, Punnett, TierChip } from "@/components/visuals";
import { ReadAloud } from "@/components/Voice";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function CoupleView() {
  const { t, lang, level } = useI18n();
  const qc = useQueryClient();
  const couple = useQuery({ queryKey: ["couple"], queryFn: () => api.couple() });
  const expl = useQuery({ queryKey: ["expl", lang, level], queryFn: () => api.explanation(lang, level) });
  const grant = useMutation({ mutationFn: api.grantPooling, onSuccess: () => qc.invalidateQueries() });
  const c = couple.data;
  const released = !!c?.tier && !c.awaiting_counsellor;
  const step = !c?.tier ? 0 : c.awaiting_counsellor ? 1 : 2;
  const pct = (x: number) => (x === 0 ? "0%" : x < 0.01 ? t("viz.lessThanOnePct") : `${Math.round(x * 100)}%`);
  return (
    <section className="space-y-6">
      <PageHeader title={t("couple.title")} lead={t("couple.lead")} action={c?.tier ? <TierChip tier={c.tier} /> : undefined} />
      <div data-demo="steps"><Steps labels={[t("couple.s1"), t("couple.s2"), t("couple.s3")]} current={step} /></div>
      {!c?.tier && (
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-read">{t("couple.waiting")}</p>
          <button className="btn" data-demo="share" onClick={() => grant.mutate()}><Users aria-hidden className="h-4 w-4" />{t("couple.pooling")}</button>
        </div>
      )}
      {c?.awaiting_counsellor && <Notice>{t("couple.tier3")}</Notice>}
      {released && !c?.findings?.length && <Notice>{t("couple.noFindings")}</Notice>}
      {c?.findings?.map((f) => (
        <article key={f.condition_id} data-demo="finding" className="card grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{lang === "ar" && f.label_ar ? f.label_ar : f.label ?? f.condition_id}</h2>
            {f.risk_affected !== null ? (
              <p className="flex items-baseline gap-3">
                <span className="text-5xl font-bold tabular-nums text-brand-700" dir={f.risk_affected > 0 && f.risk_affected < 0.01 ? undefined : "ltr"}>{pct(f.risk_affected)}</span>
                <span className="text-sm text-muted">{f.inheritance === "XLR" ? t("couple.chanceSon") : t("couple.chance")}</span>
              </p>
            ) : <p className="text-muted">{t("result.unclear")}</p>}
            {f.formula_id === "ar_both_carrier" && f.risk_affected !== null && <Punnett affected={f.risk_affected} carrier={f.inputs?.carrier_child ?? 0.5} />}
            {c.related && f.note_codes.includes("related_partners") && <p className="text-sm text-muted">{t("couple.relatedNote")}</p>}
          </div>
          {f.risk_affected !== null && <IconArray risk={f.risk_affected} />}
        </article>
      ))}
      {released && !!expl.data && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("result.explanation")}</h2>
            <ReadAloud text={expl.data.blocks.join(" ")} />
          </div>
          <div className="max-w-read space-y-3">{expl.data.blocks.map((b, i) => <p key={i}>{b}</p>)}</div>
        </div>
      )}
      {c?.tier && <p className="max-w-read text-sm text-muted">{t("couple.uncertainty")}</p>}
    </section>
  );
}
