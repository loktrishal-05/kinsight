"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareText } from "lucide-react";
import { Notice, PageHeader, StatusChip } from "@/components/ui";
import { ReadAloud } from "@/components/Voice";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function MyResult() {
  const { t, lang, level } = useI18n();
  const qc = useQueryClient();
  const results = useQuery({ queryKey: ["results"], queryFn: api.results });
  const expl = useQuery({ queryKey: ["expl", lang, level], queryFn: () => api.explanation(lang, level) });
  const talk = useMutation({ mutationFn: () => api.requestCounselling(), onSuccess: () => qc.invalidateQueries({ queryKey: ["referral"] }) });
  return (
    <section className="space-y-6">
      <PageHeader title={t("result.title")} lead={t("result.lead")} />
      <div className="card-flush">
        {results.isLoading && <p className="p-5 text-muted">{t("loading")}</p>}
        <ul className="px-5">
          {results.data?.map((r) => (
            <li key={r.condition_id} className="row">
              <span className="font-medium">{lang === "ar" && r.label_ar ? r.label_ar : r.label ?? r.condition_id}</span>
              <StatusChip status={r.status} />
            </li>
          ))}
        </ul>
      </div>
      <Notice>{t("result.carrierNote")}</Notice>
      <div className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("result.explanation")}</h2>
          <ReadAloud text={expl.data?.blocks.join(" ") ?? ""} />
        </div>
        <div className="max-w-read space-y-3" data-testid="explanation">
          {expl.data?.blocks.map((b, i) => <p key={i}>{b}</p>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={talk.isSuccess} onClick={() => talk.mutate()}>
          {talk.isSuccess ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : <MessageSquareText aria-hidden className="h-4 w-4" />}
          {talk.isSuccess ? t("result.talkDone") : t("result.talk")}
        </button>
      </div>
    </section>
  );
}
