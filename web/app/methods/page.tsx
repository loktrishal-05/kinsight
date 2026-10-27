"use client";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Notice, PageHeader } from "@/components/ui";
import { DATA } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";

// Prose comes from messages (methods.pipe.*, methods.formula.*, methods.kin.*); formulas stay as notation.
const PIPELINE = [0, 1, 2, 3, 4];
const FORMULAS: { id: string; en: string }[] = [
  { id: "ar_both_carrier", en: "affected = 1/4 · carrier = 1/2 · neither = 1/4" },
  { id: "ar_one_carrier_residual", en: "prior = r + (1 − r)·c;  post = prior(1−s) / (prior(1−s) + (1−prior));  risk = ¼ · post" },
  { id: "ar_both_not_detected", en: "p = c(1−s) / (c(1−s) + (1−c));  risk = ¼ · p²" },
  { id: "xlr_mother_carrier", en: "each son affected = 1/2 · each daughter carrier = 1/2" },
  { id: "kinship", en: "k(i,j) = ½ · (k(father_i, j) + k(mother_i, j));  F_child = k(father, mother)" },
];
const KIN: [string, string][] = [["First cousins", "1/16"], ["Double first cousins", "1/8"], ["Full siblings", "1/4"], ["Half-siblings", "1/8"], ["Uncle and niece", "1/8"], ["Second cousins", "1/64"], ["Unrelated", "0"]];

export default function Methods() {
  const { t } = useI18n();
  const s = DATA.scenarios[0];
  return (
    <section className="space-y-8">
      <PageHeader title={t("methods.title")} lead={t("methods.lead")} />

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">{t("methods.pipeline")}</h2>
        <ol className="space-y-4">
          {PIPELINE.map((p) => (
            <li key={p} className="flex gap-4">
              <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />
              <span><span className="block font-semibold">{t(`methods.pipe.${p}.t`)}</span><span className="block max-w-read text-sm text-muted">{t(`methods.pipe.${p}.d`)}</span></span>
            </li>
          ))}
        </ol>
      </div>

      <div className="card-flush" data-demo="formulas">
        <h2 className="border-b border-line px-5 py-3 text-lg font-semibold">{t("methods.formulas")}</h2>
        <ul className="divide-y divide-line">
          {FORMULAS.map((f) => (
            <li key={f.id} className="px-5 py-4">
              <p className="text-sm font-semibold">{f.id.replaceAll("_", " ")}</p>
              <p className="my-1.5 overflow-x-auto rounded-lg bg-sunk px-3 py-2 font-mono text-[0.8rem]" dir="ltr">{f.en}</p>
              <p className="max-w-read text-sm text-muted">{t(`methods.formula.${f.id}`)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold">{t("methods.kin")}</h2>
          <table className="w-full text-sm"><tbody>
            {KIN.map(([n, v], i) => <tr key={n} className="border-b border-line last:border-0"><td className="py-2">{t(`methods.kin.${i}`)}</td><td className="text-end font-semibold tabular-nums" dir="ltr">{v}</td><td className="w-8 text-end"><CheckCircle2 aria-label={t("methods.tested")} className="inline h-4 w-4 text-brand-600" /></td></tr>)}
          </tbody></table>
          <p className="mt-3 text-xs text-muted">{t("methods.kinNote")}</p>
        </div>
        <div className="card space-y-3">
          <h2 className="text-lg font-semibold">{t("methods.version")}</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("methods.engine")}</dt><dd className="font-semibold" dir="ltr">{s.engine_version}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("methods.config")}</dt><dd className="font-mono text-xs" dir="ltr">{s.config_hash}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("methods.cohort")}</dt><dd className="font-semibold tabular-nums" dir="ltr">{DATA.cohort.couples} / {DATA.cohort.persons}</dd></div>
          </dl>
          <p className="flex items-start gap-2 text-sm text-muted"><CircleDashed aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />{t("methods.review")}</p>
        </div>
      </div>
      <Notice>{t("methods.limits")}</Notice>
    </section>
  );
}
