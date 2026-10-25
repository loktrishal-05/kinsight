"use client";
import { ArrowDown, ArrowRight, BookOpenText, Check, FileText, Lock, MessagesSquare, PlayCircle, Route, UserRoundCheck } from "lucide-react";
import { useDemo } from "@/lib/demo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FamilyTreeArt from "@/components/FamilyTreeArt";
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
      <section data-demo="hero" className="relative isolate overflow-hidden bg-gradient-to-br from-[#04191a] via-[#0a3f3e] to-[#13283f] text-deepfg">
        <FamilyTreeArt />
        <div className="relative mx-auto flex min-h-[min(80vh,46rem)] max-w-5xl flex-col justify-center gap-7 px-4 py-16 sm:px-8">
          <p className="animate-rise inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Lock aria-hidden className="h-3.5 w-3.5" />{t("hero.badge")}
          </p>
          <h1 className="animate-rise max-w-2xl text-[2.4rem] font-bold leading-[1.08] tracking-tight text-white [animation-delay:.08s] sm:text-5xl lg:text-6xl">{t("welcome.title")}</h1>
          <p className="animate-rise max-w-lg text-lg text-deepfg/85 [animation-delay:.18s]">{t("hero.sub")}</p>
          <div className="animate-rise flex flex-wrap gap-3 [animation-delay:.28s]">
            <a href="#start" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-[#0a3f3e] shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-50">
              {t("hero.cta")}<ArrowDown aria-hidden className="h-4 w-4" />
            </a>
            {demo.available && (
              <button onClick={() => demo.start()} data-testid="demo-start" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-bold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-600">
                <PlayCircle aria-hidden className="h-5 w-5" />{t("demo.start")}
              </button>
            )}
            <Link href="/learn" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-6 text-sm font-semibold text-white transition hover:bg-white/10">{t("hero.learn")}</Link>
          </div>
          <ul className="animate-rise mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-deepfg/80 [animation-delay:.4s]">
            {["hero.p1", "hero.p2", "hero.p3"].map((k) => <li key={k} className="flex items-center gap-2"><Check aria-hidden className="h-4 w-4 text-brand-200" />{t(k)}</li>)}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-8">
        <section aria-labelledby="how" data-demo="how">
          <h2 id="how" className="text-xl font-bold">{t("how.title")}</h2>
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
          <h2 id="pick" className="text-xl font-bold">{t("welcome.pick")}</h2>
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
