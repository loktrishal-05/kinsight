"use client";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { PageHeader, StatusChip } from "@/components/ui";
import { TierChip } from "@/components/visuals";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// A one-page, print-ready take-home summary: what was found, what it means, what to ask, what happens next.
export default function Summary() {
  const { t, lang, level } = useI18n();
  const results = useQuery({ queryKey: ["results"], queryFn: api.results });
  const expl = useQuery({ queryKey: ["expl", lang, level], queryFn: () => api.explanation(lang, level) });
  const couple = useQuery({ queryKey: ["couple"], queryFn: () => api.couple() });
  const asks = ["ask1", "ask2", "ask3", "ask4", "ask5"];
  return (
    <section className="space-y-6">
      <PageHeader title={t("summary.title")} lead={t("summary.lead")}
        action={<button className="btn" data-noprint onClick={() => window.print()}><Printer aria-hidden className="h-4 w-4" />{t("summary.print")}</button>} />
      <p className="note">{t("banner")}</p>
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">{t("summary.found")}</h2>
        <ul>{results.data?.map((r) => (
          <li key={r.condition_id} className="row"><span>{lang === "ar" && r.label_ar ? r.label_ar : r.label ?? r.condition_id}</span><StatusChip status={r.status} /></li>
        ))}</ul>
        {couple.data?.tier && <p className="flex items-center gap-2 text-sm">{t("summary.level")}: <TierChip tier={couple.data.tier} /></p>}
      </div>
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold">{t("result.explanation")}</h2>
        <div className="max-w-read space-y-2">{expl.data?.blocks.map((b, i) => <p key={i}>{b}</p>)}</div>
      </div>
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold">{t("summary.ask")}</h2>
        <ul className="list-disc space-y-1.5 ps-5">{asks.map((a) => <li key={a}>{t(`summary.${a}`)}</li>)}</ul>
      </div>
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold">{t("next.title")}</h2>
        <ul className="list-disc space-y-1.5 ps-5">{["o1", "o2", "o3", "o4", "o5"].map((o) => <li key={o}>{t(`next.${o}`)}</li>)}</ul>
        <p className="mt-3 text-sm text-muted">{t("summary.choice")}</p>
      </div>
    </section>
  );
}
