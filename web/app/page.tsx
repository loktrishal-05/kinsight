"use client";
import { ArrowRight, BookOpenText, Check, FileText, MessagesSquare, PlayCircle, Route, UserRoundCheck } from "lucide-react";
import { useDemo } from "@/lib/demo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LatticeHero from "@/components/LatticeHero";
import Statement from "@/components/Statement";
import { TierChip } from "@/components/visuals";
import { api, MOCK } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { HOME, PERSONAS, useSession } from "@/lib/session";

const GROUPS: { label: string; ids: readonly (typeof PERSONAS)[number][] }[] = [
  { label: "welcome.asPerson", ids: ["person_a", "person_b", "relative"] },
  { label: "welcome.asPro", ids: ["counsellor", "analyst", "auditor", "demo_operator"] },
];
const JOURNEY = [
  { icon: FileText, k: "j1" }, { icon: BookOpenText, k: "j2" }, { icon: MessagesSquare, k: "j3" }, { icon: Route, k: "j4" }, { icon: UserRoundCheck, k: "j5" },
];

export default function Welcome() {
  const { t, lang } = useI18n();
  const { persona, choose } = useSession();
  const router = useRouter();
  const [scenario, setScenario] = useState("s3");
  const demo = useDemo();
  useEffect(() => setScenario(api.scenario()), []);
  const l = lang === "ar" ? "ar" : "en";
  return (
    <div>
      <LatticeHero />

      <section className="mx-auto max-w-5xl px-5 py-24 sm:px-8 sm:py-32">
        <Statement text={t("landing.statement")} />
      </section>

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-8">
        <section aria-labelledby="how" data-demo="how">
          <h2 id="how" className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.08] tracking-[-0.03em]">{t("how.title")}</h2>
          <ol className="relative mt-6 grid gap-6 sm:grid-cols-5 sm:gap-4">
            <span aria-hidden className="absolute start-4 top-4 hidden h-0.5 w-[calc(100%-2rem)] bg-line sm:block" />
            {JOURNEY.map(({ icon: Icon, k }) => (
              <li key={k} className="relative flex gap-4 sm:flex-col sm:gap-3">
                <span className="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-brand-600 bg-surface text-brand-700"><Icon aria-hidden className="h-4 w-4" /></span>
                <span>
                  <span className="block font-semibold">{t(`how.${k}.t`)}</span>
                  <span className="block text-sm text-muted">{t(`how.${k}.d`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

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

      {demo.available && (
        <section aria-labelledby="close" className="relative isolate overflow-hidden border-t border-line bg-sand">
          <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full text-brand-600/[.07]">
            <defs>
              <pattern id="lattice" width="44" height="44" patternUnits="userSpaceOnUse">
                <path fill="currentColor" d="M22 6.5l4.3 4.7 6.4-.3-.3 6.4 4.7 4.3-4.7 4.3.3 6.4-6.4-.3L22 37.5l-4.3-4.5-6.4.3.3-6.4L6.9 22.6l4.7-4.3-.3-6.4 6.4.3z" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lattice)" />
          </svg>
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-5 py-24 sm:px-8 sm:py-28">
            <h2 id="close" className="max-w-2xl font-display text-[clamp(2rem,4.6vw,3.8rem)] font-bold leading-[1.02] tracking-[-0.035em]">{t("landing.close.t")}</h2>
            <p className="max-w-xl text-lg text-ink/75">{t("landing.close.d")}</p>
            <button onClick={() => demo.start()} className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 ps-5 pe-6 text-sm font-bold text-onbrand shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-700">
              <PlayCircle aria-hidden className="h-5 w-5 transition group-hover:scale-110" />{t("demo.start")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
