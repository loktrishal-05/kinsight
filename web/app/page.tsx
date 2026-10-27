"use client";
// Public landing page, outside the app shell: cinematic 3D hero, statement, the five-step path, and a closing call to sign in.
import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import Journey from "@/components/Journey";
import LatticeHero from "@/components/LatticeHero";
import Statement from "@/components/Statement";
import { useDemo } from "@/lib/demo";
import { useI18n } from "@/lib/i18n";
import { Brand, LangSwitch } from "@/components/PublicChrome";

export default function Landing() {
  const { t } = useI18n();
  const demo = useDemo();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
        <nav aria-label="KinSight" className="mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-full border border-line/80 bg-surface/80 ps-4 pe-2 shadow-card backdrop-blur-md">
          <Brand />
          <a href="#how" className="ms-4 hidden text-sm font-semibold text-ink/70 hover:text-ink md:block">{t("landing.nav.how")}</a>
          <div className="ms-auto flex items-center gap-2">
            <LangSwitch />
            <Link href="/signin" data-testid="nav-signin" className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-ink px-4 text-sm font-bold text-canvas sm:px-5 transition hover:bg-brand-800">{t("signin.cta")}</Link>
          </div>
        </nav>
      </header>

      <main>
        <LatticeHero />

        <section className="mx-auto max-w-5xl px-5 py-24 sm:px-8 sm:py-32">
          <Statement text={t("landing.statement")} />
        </section>

        <div className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          <Journey />
        </div>

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
            <div className="flex flex-wrap gap-3">
              <Link href="/signin" className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 ps-6 pe-5 text-sm font-bold text-onbrand shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-700">
                {t("signin.cta")}<ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
              {demo.available && (
                <button onClick={() => demo.start()} className="inline-flex h-12 items-center gap-2 rounded-full border border-ink/15 bg-surface/80 px-6 text-sm font-bold text-ink shadow-card transition hover:-translate-y-0.5 hover:border-brand-500">
                  <PlayCircle aria-hidden className="h-5 w-5" />{t("demo.start")}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-8 text-xs text-muted sm:px-8">
        <div className="mx-auto max-w-5xl space-y-1"><p>{t("banner")}</p><p>{t("limits")}</p></div>
      </footer>
    </div>
  );
}
