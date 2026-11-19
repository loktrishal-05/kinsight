"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Estimate, Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { METHODS, type Method } from "@/lib/cascadeTracker";
import { conditionLabel } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

const pct = (x: number) => `${Math.round(x * 100)}%`;

// Relatives who may want testing, with an educational estimate each. The person chooses how, or whether, to reach them;
// relatives only ever receive a condition-scoped invite and never see this person's result.
export default function Cascade() {
  const { t, lang } = useI18n();
  const { persona } = useSession();
  const qc = useQueryClient();
  const [links, setLinks] = useState<Record<string, string>>({});
  const view = useQuery({ queryKey: ["cascade", persona], queryFn: api.cascadeTracker });
  const contact = useMutation({
    mutationFn: ({ rel, cond, method }: { rel: string; cond: string; method: Method }) => api.cascadeContact(rel, cond, method),
    onSuccess: (data, v) => { if (data.token) setLinks((l) => ({ ...l, [`${v.rel}|${v.cond}`]: data.token! })); qc.invalidateQueries({ queryKey: ["cascade", persona] }); },
  });
  const all = view.data?.conditions.flatMap((c) => c.relatives) ?? [];
  const reached = all.filter((r) => r.status !== "not_contacted").length;
  const share = all.length ? reached / all.length : 0;
  return (
    <section className="space-y-6">
      <PageHeader title={t("cascade.title")} lead={t("cascade.lead")} />
      <Notice>{t("cascade.private")}</Notice>
      {view.isError && <p role="alert" className="note">{t("lifecycle.error")}</p>}
      {view.isSuccess && !all.length && !view.data.conditions.some((c) => c.needs_counsellor) && <p role="status">{t("cascade.none")}</p>}
      {all.length > 0 && <div className="card flex items-center gap-5" data-demo="cascade-progress">
        <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgb(var(--line))" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgb(var(--b600))" strokeWidth="3.5" strokeDasharray={`${share * 100} 100`} pathLength={100} />
        </svg>
        <p><b className="tabular-nums" dir="ltr">{reached} / {all.length}</b> {t("cascade.progress")}</p>
      </div>}
      {view.data?.conditions.map((c) => (
        <article key={c.condition_id} className="card space-y-3" aria-labelledby={`c-${c.condition_id}`}>
          <h2 id={`c-${c.condition_id}`} className="text-lg font-semibold">{conditionLabel(c.condition_id, lang)}</h2>
          {c.needs_counsellor && <Notice>{t("cascade.xlinked")}</Notice>}
          <ul className="divide-y divide-line">{c.relatives.map((r) => {
            const key = `${r.id}|${c.condition_id}`;
            return <li key={key} className="space-y-2 py-3" data-demo="cascade-relative">
              <div className="flex flex-wrap items-start gap-3">
                <div className="me-auto">
                  <p className="font-semibold">{t(`cascade.relation.${r.relation}`)} <span className="text-xs text-muted" dir="ltr">({r.id})</span></p>
                  <p className="text-sm text-muted">{t(`cascade.degree.${r.degree}`)}</p>
                </div>
                <div className="text-sm">{t("cascade.chance")}: <Estimate est={r.chance}><b className="tabular-nums" dir="ltr">{pct(r.chance.value ?? 0)}</b></Estimate></div>
                <span className="chip bg-sunk" data-demo="cascade-status">{t(`cascade.status.${r.status}`)}</span>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("cascade.how")}>
                {METHODS.map((m) => <button key={m} className="btn-quiet btn-sm" aria-pressed={r.method === m} disabled={contact.isPending}
                  onClick={() => contact.mutate({ rel: r.id, cond: c.condition_id, method: m })}>{t(`cascade.method.${m}`)}</button>)}
              </div>
              {links[key] && <p className="text-sm">{t("cascade.linkReady")} <code className="break-all rounded bg-sunk px-1" data-demo="cascade-link">{links[key]}</code></p>}
            </li>;
          })}</ul>
        </article>
      ))}
      <p className="max-w-read text-sm text-muted">{t("cascade.choices")}</p>
    </section>
  );
}
