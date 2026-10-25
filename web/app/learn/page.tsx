"use client";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { IconArray, Punnett } from "@/components/visuals";
import { useI18n } from "@/lib/i18n";
import { GLOSSARY, MYTHS } from "@/lib/learn";

export default function Learn() {
  const { t, lang } = useI18n();
  const l = lang === "ar" ? "ar" : "en";
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState(0.25);
  const terms = GLOSSARY.filter((g) => (g.term[l] + g.meaning[l]).toLowerCase().includes(q.trim().toLowerCase()));
  useEffect(() => { if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "center" }); }, []);
  return (
    <section className="space-y-8">
      <PageHeader title={t("learn.title")} lead={t("learn.lead")} />

      <div className="card grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t("learn.inherit.t")}</h2>
          <p className="text-sm text-muted">{t("learn.inherit.d")}</p>
          <Punnett affected={0.25} carrier={0.5} />
          <p className="text-xs text-muted">{t("learn.inherit.note")}</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t("learn.chance.t")}</h2>
          <p className="text-sm text-muted">{t("learn.chance.d")}</p>
          <div role="group" aria-label={t("learn.chance.t")} className="seg w-fit">
            {[0.25, 0.5, 0.01].map((r) => <button key={r} aria-pressed={risk === r} onClick={() => setRisk(r)}>{r === 0.01 ? "1 / 100" : r === 0.25 ? "1 / 4" : "1 / 2"}</button>)}
          </div>
          <IconArray risk={risk} />
          <p className="text-xs text-muted">{t("learn.chance.note")}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("learn.myths")}</h2>
        <ul className="card-flush divide-y divide-line">
          {MYTHS.map((m, i) => (
            <li key={i} className="grid gap-1 px-5 py-4 md:grid-cols-2 md:gap-6">
              <p className="text-muted line-through decoration-muted/40">{m.myth[l]}</p>
              <p className="font-medium">{m.fact[l]}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("learn.glossary")}</h2>
          <label className="relative block w-full max-w-xs">
            <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="field ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("learn.search")} aria-label={t("learn.search")} />
          </label>
        </div>
        <dl className="card-flush divide-y divide-line">
          {terms.map((g) => (
            <div key={g.id} id={g.id} className="scroll-mt-28 px-5 py-4">
              <dt className="font-semibold">{g.term[l]}</dt>
              <dd className="mt-1 max-w-read text-sm text-muted">{g.meaning[l]}</dd>
            </div>
          ))}
          {terms.length === 0 && <p className="px-5 py-6 text-sm text-muted">{t("palette.none")}</p>}
        </dl>
      </div>
    </section>
  );
}
