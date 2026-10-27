"use client";
import { ArrowRight, Check, PlayCircle } from "lucide-react";
import { useDemo } from "@/lib/demo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Journey from "@/components/Journey";
import { TierChip } from "@/components/visuals";
import { api, MOCK } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { HOME, PERSONAS, useSession } from "@/lib/session";

const GROUPS: { label: string; ids: readonly (typeof PERSONAS)[number][] }[] = [
  { label: "welcome.asPerson", ids: ["person_a", "person_b", "relative"] },
  { label: "welcome.asPro", ids: ["counsellor", "analyst", "auditor", "demo_operator"] },
];

export default function Home() {
  const { t, lang } = useI18n();
  const { persona, choose } = useSession();
  const router = useRouter();
  const [scenario, setScenario] = useState("s3");
  const demo = useDemo();
  useEffect(() => setScenario(api.scenario()), []);
  const l = lang === "ar" ? "ar" : "en";
  return (
    <div>
      <section data-demo="hero" aria-labelledby="home-title" className="flex flex-col items-start gap-4">
        <h1 id="home-title" className="max-w-3xl font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.035em]">{t("welcome.title")}</h1>
        <p className="max-w-2xl text-ink/75">{t("hero.sub")}</p>
        {demo.available && (
          <button onClick={() => demo.start()} className="btn rounded-full ps-4 pe-5"><PlayCircle aria-hidden className="h-4 w-4" />{t("demo.start")}</button>
        )}
      </section>

      <div className="mt-12 space-y-14">
        <Journey demo />

        <section id="start" aria-labelledby="pick" className="scroll-mt-24 space-y-8">
          <h2 id="pick" className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.08] tracking-[-0.03em]">{t("welcome.pick")}</h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {MOCK && (
              <div>
                <p className="eyebrow-free mb-2">{t("welcome.cases")}</p>
                <ul data-demo="cases" className="card-flush divide-y divide-line" role="radiogroup" aria-label={t("welcome.cases")}>
                  {api.scenarios().map((s) => (
                    <li key={s.id}>
                      <button role="radio" aria-checked={scenario === s.id} onClick={() => { api.setScenario(s.id); setScenario(s.id); }}
                        className={`flex w-full items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-brand-50 ${scenario === s.id ? "bg-brand-50" : ""}`}>
                        <span aria-hidden className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${scenario === s.id ? "border-brand-600 bg-brand-600" : "border-line"}`}>
                          {scenario === s.id && <Check className="h-2.5 w-2.5 text-onbrand" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2"><span className="font-semibold">{s.title[l]}</span><TierChip tier={s.tier} /></span>
                          <span className="mt-0.5 block text-sm text-muted">{s.blurb[l]}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={MOCK ? "" : "lg:col-span-2"} data-demo="personas">
              {GROUPS.map((g) => (
                <div key={g.label} className="mb-6 last:mb-0">
                  <p className="eyebrow-free mb-2">{t(g.label)}</p>
                  <ul className="card-flush divide-y divide-line">
                    {g.ids.map((p) => (
                      <li key={p}>
                        <button onClick={async () => { await choose(p); router.push(HOME[p]); }} aria-pressed={persona === p}
                          className={`flex w-full items-center justify-between gap-4 px-4 py-3.5 text-start transition-colors hover:bg-brand-50 ${persona === p ? "bg-brand-50" : ""}`}>
                          <span>
                            <span className="block font-semibold">{t(`persona.${p}`)}</span>
                            <span className="block text-sm text-muted">{t(`persona.desc.${p}`)}</span>
                          </span>
                          <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-brand-600 rtl:rotate-180" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
