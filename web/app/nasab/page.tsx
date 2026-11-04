"use client";
import Restricted from "@/components/Restricted";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Notice, PageHeader } from "@/components/ui";
import { api, MOCK } from "@/lib/api";
import { RELATIONS, type Relation } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function Nasab() {
  const { t } = useI18n();
  const { persona } = useSession();
  if (persona !== "person_a" && persona !== "person_b" && persona !== "relative" && persona !== "demo_operator") return <Restricted text={t("plan.familyRestricted")} />;
  return <Questions key={persona} />;
}

function Questions() {
  const { t, td } = useI18n();
  const [relations, setRelations] = useState<Relation[]>(["none"]);
  const nasab = useMutation({ mutationFn: () => api.nasab({ relations }) });
  return <section className="space-y-6">
    <PageHeader title={t("plan.nasab")} />
    {MOCK && <Notice>{t("plan.demo")}</Notice>}
    {nasab.isError && <p role="alert" className="note">{t("plan.error")}</p>}
    <section className="card space-y-4" aria-labelledby="questions-title">
      <h2 id="questions-title" className="text-lg font-semibold">{t("plan.relatedQuestion")}</h2>
      <p>{t("plan.loopsHelp")}</p>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); nasab.mutate(); }}>
        {relations.map((relation, i) => <fieldset key={i} className="space-y-2">
          <legend className="font-semibold">{t("plan.connection")} {i + 1}</legend>
          <div className="flex flex-wrap gap-2">{RELATIONS.filter((v) => i === 0 || v !== "none").map((value) => <button key={value} type="button" className="btn-quiet" aria-pressed={relation === value} onClick={() => {
            setRelations(value === "none" ? ["none"] : relations.map((r, n) => n === i ? value : r)); nasab.reset();
          }}>{t(`plan.relation.${value}`)}</button>)}</div>
        </fieldset>)}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-quiet" disabled={relations.length >= 4 || relations.includes("none")} onClick={() => { setRelations([...relations, "first_cousins"]); nasab.reset(); }}>{t("plan.addLoop")}</button>
          {relations.length > 1 && <button type="button" className="btn-quiet" onClick={() => { setRelations(relations.slice(0, -1)); nasab.reset(); }}>{t("plan.removeLoop")}</button>}
          <button className="btn-quiet" disabled={nasab.isPending}>{t("plan.showEstimate")}</button>
        </div>
      </form>
      {nasab.data && <div role="status" className="space-y-2">
        <p>{t("plan.coefficient")}: <bdi>{nasab.data.f}</bdi></p>
        <p>{td(nasab.data.label_key)}</p>
        <p>{t("plan.estimateNote")}</p>
        {nasab.data.warnings.map((warning, i) => <p key={i}>{td(warning)}</p>)}
      </div>}
    </section>
  </section>;
}
