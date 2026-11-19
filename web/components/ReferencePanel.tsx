"use client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Provenance = { source: string; version: string | null; url: string; fetched_at: string };

function Source({ p }: { p: Provenance }) {
  const { t } = useI18n();
  return <p className="text-xs text-muted">{t("ref.source")}: <a className="underline" href={p.url} target="_blank" rel="noopener noreferrer">{p.source}</a>
    {p.version && ` · ${p.version}`} · {t("ref.fetched")} <time dateTime={p.fetched_at}>{p.fetched_at.slice(0, 10)}</time></p>;
}

// Live public reference data for a gene and, optionally, a variant. Only what is typed here is sent to the sources.
export default function ReferencePanel() {
  const { t } = useI18n();
  const [gene, setGene] = useState("CFTR");
  const [variant, setVariant] = useState("NM_000492.4:c.1521_1523del");
  const look = useMutation({ mutationFn: () => api.reference(gene.trim().toUpperCase(), variant.trim() || undefined) });
  const d = look.data;
  const down = (name: string) => d?.unavailable.includes(name);
  return (
    <section className="card space-y-4" aria-labelledby="ref-title" data-demo="reference">
      <h2 id="ref-title" className="text-lg font-semibold">{t("ref.title")}</h2>
      <p className="text-sm text-muted">{t("ref.lead")}</p>
      <form className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); look.mutate(); }}>
        <label className="text-sm font-medium">{t("ref.gene")}<input className="field mt-1" dir="ltr" value={gene} maxLength={15} onChange={(e) => setGene(e.target.value)} /></label>
        <label className="text-sm font-medium">{t("ref.variant")}<input className="field mt-1" dir="ltr" value={variant} maxLength={90} onChange={(e) => setVariant(e.target.value)} /></label>
        <button className="btn-quiet" disabled={look.isPending}>{t("ref.look")}</button>
      </form>
      {look.isError && <p role="alert" className="note">{t("ref.error")}</p>}
      {d && <div className="space-y-4" role="status">
        <div>
          <h3 className="font-semibold">MedlinePlus Genetics</h3>
          {d.medlineplus ? <><p className="text-sm"><b>{d.medlineplus.name}.</b> {d.medlineplus.summary}</p><Source p={d.medlineplus.provenance} /></> : <p className="text-sm text-muted">{down("medlineplus") ? t("ref.down") : t("ref.none")}</p>}
        </div>
        <div>
          <h3 className="font-semibold">{t("ref.validity")}</h3>
          {d.clingen ? <>{d.clingen.curations.length ? <ul className="list-disc ps-5 text-sm">{d.clingen.curations.map((c) => <li key={c.disease}>{c.disease} · {c.inheritance} · <b>{c.classification}</b> ({c.released})</li>)}</ul>
            : <p className="text-sm text-muted">{t("ref.none")}</p>}<Source p={d.clingen.provenance} /></> : <p className="text-sm text-muted">{t("ref.down")}</p>}
        </div>
        {(d.vep || down("vep")) && <div>
          <h3 className="font-semibold">{t("ref.consequence")}</h3>
          {d.vep ? <><p className="text-sm" dir="ltr"><code>{d.vep.variant}</code>: <b>{(d.vep.consequence ?? "").replaceAll("_", " ")}</b> ({d.vep.genes.join(", ")})</p><Source p={d.vep.provenance} /></> : <p className="text-sm text-muted">{t("ref.down")}</p>}
        </div>}
      </div>}
    </section>
  );
}
