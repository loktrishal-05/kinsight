"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function MyResult() {
  const { t, lang, level } = useI18n();
  const qc = useQueryClient();
  const results = useQuery({ queryKey: ["results"], queryFn: api.results });
  const expl = useQuery({ queryKey: ["expl", lang, level], queryFn: () => api.explanation(lang, level) });
  const talk = useMutation({ mutationFn: () => api.referralEvent("demo-case", "counselling_requested", ""), onSuccess: () => qc.invalidateQueries({ queryKey: ["referral"] }) });
  const word = (s: string) => (s === "carrier" ? t("result.found") : s === "not_detected" ? t("result.notfound") : t("result.unclear"));
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("result.title")}</h1>
      {results.isLoading && <p>{t("loading")}</p>}
      <ul className="space-y-2">
        {results.data?.map((r) => (
          <li key={r.condition_id} className="card flex items-center justify-between">
            <span>{r.label ?? r.condition_id}</span>
            <span className="rounded bg-calm px-3 py-1 text-sm">{word(r.status)}</span>
          </li>
        ))}
      </ul>
      <p className="note">{t("result.carrierNote")}</p>
      <div className="card">
        <h2 className="mb-2 font-medium">{t("result.explanation")}</h2>
        <div className="space-y-2" data-testid="explanation">
          {expl.data?.blocks.map((b, i) => <p key={i}>{b}</p>)}
        </div>
      </div>
      <button className="btn" disabled={talk.isSuccess} onClick={() => talk.mutate()}>{talk.isSuccess ? t("result.talkDone") : t("result.talk")}</button>
    </section>
  );
}
