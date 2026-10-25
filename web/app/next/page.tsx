"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function NextSteps() {
  const { t } = useI18n();
  const steps = useQuery({ queryKey: ["referral"], queryFn: api.referral });
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("next.title")}</h1>
      <p className="note">{t("next.intro")}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {["o1", "o2", "o3", "o4", "o5"].map((o) => <li key={o} className="card">{t(`next.${o}`)}</li>)}
      </ul>
      <div className="card">
        <h2 className="mb-2 font-medium">{t("next.timeline")}</h2>
        <ol className="space-y-1" data-testid="timeline">
          {steps.data?.map((s, i) => (
            <li key={i} className="flex flex-wrap gap-3">
              <span>{s.state}</span>
              <span className="text-sm text-slate-600">{t("next.due")}: {new Date(s.due_at * 1000).toLocaleDateString(undefined, { numberingSystem: "latn" })}</span>
              {s.overdue && <strong>{t("next.overdue")}</strong>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
