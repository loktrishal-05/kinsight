"use client";
import { useQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Journey } from "@/components/visuals";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function NextSteps() {
  const { t, td, lang } = useI18n();
  const steps = useQuery({ queryKey: ["referral"], queryFn: api.referral });
  const date = (s: number) => new Date(s * 1000).toLocaleDateString(lang === "ar" ? "ar-AE-u-nu-latn" : lang, { dateStyle: "medium" });
  const last = steps.data?.[steps.data.length - 1];
  return (
    <section className="space-y-6">
      <PageHeader title={t("next.title")} lead={t("next.lead")} />
      <div className="card" data-demo="journey">
        <h2 className="mb-4 text-lg font-semibold">{t("journey.title")}</h2>
        <Journey current={last?.state ?? "result_released"} overdue={last?.overdue} />
        <p className="mt-4 text-sm text-muted">{t("journey.note")}</p>
      </div>
      <ul className="card-flush px-5">
        {["o1", "o2", "o3", "o4", "o5"].map((o) => (
          <li key={o} className="row items-start">
            <div><p className="font-semibold">{t(`next.${o}`)}</p><p className="text-sm text-muted">{t(`next.${o}.d`)}</p></div>
          </li>
        ))}
      </ul>
      <div className="card">
        <h2 className="mb-1 text-lg font-semibold">{t("values.title")}</h2>
        <p className="mb-3 text-sm text-muted">{t("values.note")}</p>
        <ul className="list-disc space-y-1.5 ps-5">{["q1", "q2", "q3"].map((q) => <li key={q}>{t(`values.${q}`)}</li>)}</ul>
      </div>
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold">{t("next.timeline")}</h2>
        {!steps.data?.length && <p className="text-sm text-muted">{t("next.noSteps")}</p>}
        <ol className="space-y-3" data-testid="timeline">
          {steps.data?.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3">
              <Clock3 aria-hidden className="h-4 w-4 text-brand-600" />
              <span className="font-medium">{td(`state.${s.state}`)}</span>
              <span className="text-sm text-muted">{t("next.due")}: {date(s.due_at)}</span>
              {s.overdue && <span className="chip bg-unsure-bg text-unsure-fg">{t("next.overdue")}</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
