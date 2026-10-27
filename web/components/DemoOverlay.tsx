"use client";
import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo } from "@/lib/demo";
import { STEPS } from "@/lib/demoScript";
import { LANGUAGES, useI18n } from "@/lib/i18n";

type Rect = { x: number; y: number; w: number; h: number } | null;

// Spotlight (a hole in a dimmed layer around the current target) plus a caption card with controls.
// Pointer events pass through the dimmed layer, so the automation's clicks and the viewer's own clicks both work.
export default function DemoOverlay() {
  const d = useDemo();
  const { t } = useI18n();
  const [rect, setRect] = useState<Rect>(null);
  const step = STEPS[d.index];
  const l = d.demoLang;

  useEffect(() => {
    if (!d.active || d.done || !step?.target) { setRect(null); return; }
    let raf = 0;
    const tick = () => {
      const el = document.querySelector(`[data-demo="${step.target}"]`);
      if (el) { const r = el.getBoundingClientRect(); setRect(r.width && r.height ? { x: r.left, y: r.top, w: r.width, h: r.height } : null); }
      else setRect(null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [d.active, d.done, step?.target, d.index]);

  if (!d.active) return null;
  const pad = 8;
  // Caption goes to the top when the target leaves more room above it than below (e.g. Kin's panel anchored at the bottom).
  const atTop = !!rect && rect.y > innerHeight - rect.y - rect.h;
  return (
    <div data-noprint>
      {!d.done && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[55]">
          {rect ? (
            <div className="absolute rounded-xl ring-2 ring-brand-500 transition-all duration-300 ease-out"
              style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2, boxShadow: "0 0 0 9999px rgb(4 20 22 / .5)" }} />
          ) : <div className="absolute inset-0 bg-[rgb(4_20_22_/_.25)]" />}
        </div>
      )}

      {!d.done ? (
        <section role="region" aria-label={t("demo.title")} aria-live="polite" data-testid="demo-caption" data-step={step.id}
          className={`fixed start-3 z-[60] w-[min(36rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift sm:start-5 ${atTop ? "top-3 sm:top-5" : "bottom-3 sm:bottom-5"}`}>
          <div className="h-1 bg-sunk"><div className="h-full bg-brand-600 transition-all" style={{ width: `${((d.index + 1) / STEPS.length) * 100}%` }} /></div>
          <div className="space-y-2 p-4" dir={l === "ar" ? "rtl" : "ltr"}>
            <p className="text-xs font-semibold text-muted tabular-nums">{t("demo.step")} {d.index + 1} / {STEPS.length}</p>
            <h2 className="text-base font-bold leading-snug">{t(`demo.${step.id}.title`)}</h2>
            <p className="text-sm text-ink/85">{t(`demo.${step.id}.text`)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
            <button className="btn-quiet h-8 w-8 px-0" onClick={d.prev} disabled={d.index === 0} aria-label={t("demo.prev")}><ChevronLeft aria-hidden className="h-4 w-4 rtl:rotate-180" /></button>
            <button className="btn h-8 w-8 px-0" onClick={d.toggle} aria-label={d.playing ? t("demo.pause") : t("demo.play")} data-testid="demo-toggle">
              {d.playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
            </button>
            <button className="btn-quiet h-8 w-8 px-0" onClick={d.next} aria-label={t("demo.next")}><ChevronRight aria-hidden className="h-4 w-4 rtl:rotate-180" /></button>
            <select className="field hidden h-8 w-auto py-0 text-xs sm:block" value={d.speed} onChange={(e) => d.setSpeed(+e.target.value)} aria-label={t("demo.speed")}>
              {[0.75, 1, 1.5, 2].map((s) => <option key={s} value={s}>{s}×</option>)}
            </select>
            <button className="btn-quiet h-8 w-8 px-0" aria-pressed={d.voice} onClick={() => d.setVoice(!d.voice)} aria-label={t("demo.narrate")} title={t("demo.narrate")}>
              {d.voice ? <Volume2 aria-hidden className="h-4 w-4" /> : <VolumeX aria-hidden className="h-4 w-4" />}
            </button>
            <select className="field h-8 w-auto py-0 text-xs" value={l} onChange={(e) => d.setDemoLang(e.target.value)} aria-label={t("demo.lang")}>
              {LANGUAGES.filter((x) => !x.hidden).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
            </select>
            <button className="btn-quiet ms-auto h-8 w-8 px-0" onClick={d.stop} aria-label={t("demo.stop")}><X aria-hidden className="h-4 w-4" /></button>
          </div>
        </section>
      ) : (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgb(4_20_22_/_.55)] p-4">
          <section role="dialog" aria-modal="true" aria-label={t("demo.doneTitle")} data-testid="demo-done" dir={l === "ar" ? "rtl" : "ltr"}
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-lift">
            <h2 className="text-xl font-bold">{t("demo.doneTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("demo.doneLead").replace("{n}", String(STEPS.length))}</p>
            <ol className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2" data-testid="demo-covered">
              {STEPS.map((s) => (
                <li key={s.id} className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {s.route ? <Link href={s.route} onClick={d.stop} className="hover:underline">{t(`demo.${s.id}.title`)}</Link> : t(`demo.${s.id}.title`)}
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="btn" onClick={d.restart}><RotateCcw aria-hidden className="h-4 w-4" />{t("demo.restart")}</button>
              <button className="btn-quiet" onClick={d.stop}>{t("demo.close")}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
