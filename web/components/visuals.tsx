"use client";
import { Check, Circle, Clock3 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function TierChip({ tier }: { tier: number }) {
  const { t } = useI18n();
  const cls = tier === 3 ? "bg-unsure-bg text-unsure-fg" : tier === 2 ? "bg-found-bg text-found-fg" : "bg-clear-bg text-clear-fg";
  return <span className={`chip ${cls}`}>{t(`tier.${tier}`)}</span>;
}

// "Out of 100 pregnancies" pictograph. It only draws the percentage the engine already supplied (rounded to whole people);
// it does not compute a risk. Below 1% it highlights nobody and says so, instead of rounding up.
export function IconArray({ risk }: { risk: number }) {
  const { t } = useI18n();
  const n = Math.round(risk * 100);
  return (
    <figure className="space-y-2" aria-label={n === 0 ? t("viz.lessThanOne") : t("viz.outOf").replace("{n}", String(n))}>
      <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[16rem]" role="img" aria-hidden style={{ direction: "ltr" }}>
        {Array.from({ length: 100 }, (_, i) => {
          const x = (i % 10) * 20 + 10, y = Math.floor(i / 10) * 20 + 10, on = i < n;
          return (
            <g key={i} fill={on ? "rgb(var(--b600))" : "rgb(var(--line))"}>
              <circle cx={x} cy={y - 4.2} r={3.2} />
              <path d={`M${x - 4.6} ${y + 6.4} v-5 a4.6 4.6 0 0 1 9.2 0 v5 z`} />
            </g>
          );
        })}
      </svg>
      <figcaption className="text-sm text-muted">{n === 0 ? t("viz.lessThanOne") : t("viz.outOf").replace("{n}", String(n))}</figcaption>
    </figure>
  );
}

// How a recessive condition is passed on when both parents carry one changed copy (standard Mendelian layout).
// The 1-in-4 and 1-in-2 fractions are the engine's own outputs for this finding (affected, carrier_child).
export function Punnett({ affected, carrier }: { affected: number; carrier: number }) {
  const { t } = useI18n();
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const cell = (key: "none" | "carrier" | "affected", l: string) => (
    <div className={`grid place-items-center rounded-lg p-3 text-center text-xs font-semibold ${key === "affected" ? "bg-found-bg text-found-fg" : key === "carrier" ? "bg-brand-100 text-brand-800" : "bg-clear-bg text-clear-fg"}`}>
      <span className="text-sm" dir="ltr">{l}</span>
      <span className="mt-0.5 font-medium">{t(`punnett.${key}`)}</span>
    </div>
  );
  return (
    <figure className="space-y-3">
      <div className="grid w-full max-w-xs grid-cols-[auto_1fr_1fr] items-stretch gap-1.5 text-center text-xs font-semibold text-muted" dir="ltr">
        <span /><span className="py-1">N</span><span className="py-1">c</span>
        <span className="grid place-items-center px-1">N</span>{cell("none", "NN")}{cell("carrier", "Nc")}
        <span className="grid place-items-center px-1">c</span>{cell("carrier", "cN")}{cell("affected", "cc")}
      </div>
      <figcaption className="max-w-xs text-sm text-muted">
        {t("punnett.axes")} {t("punnett.caption").replace("{aff}", pct(affected)).replace("{car}", pct(carrier))}
      </figcaption>
    </figure>
  );
}

const PHASES = ["result_released", "counselling_requested", "counselling_done", "confirmatory_requested", "confirmatory_done", "specialist_referral_requested", "specialist_referral_done", "closed"];

// The traceable path from result to counselling, confirmatory assessment and specialist referral.
export function Journey({ current, overdue }: { current: string; overdue?: boolean }) {
  const { t, td } = useI18n();
  const at = Math.max(0, PHASES.indexOf(current));
  return (
    <ol className="grid gap-0 sm:grid-cols-4 lg:grid-cols-8" aria-label={t("journey.title")}>
      {PHASES.map((p, i) => {
        const done = i < at, now = i === at;
        return (
          <li key={p} aria-current={now ? "step" : undefined} className="relative flex gap-3 pb-5 sm:flex-col sm:gap-2 sm:pb-0 sm:pe-2">
            <div className="flex items-center sm:w-full">
              <span className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${done ? "border-brand-600 bg-brand-600 text-onbrand" : now ? "border-brand-600 bg-surface text-brand-700" : "border-line bg-surface text-muted"}`}>
                {done ? <Check aria-hidden className="h-3.5 w-3.5" /> : now ? (overdue ? <Clock3 aria-hidden className="h-3.5 w-3.5" /> : <Circle aria-hidden className="h-2.5 w-2.5 fill-current" />) : <Circle aria-hidden className="h-2 w-2" />}
              </span>
              {i < PHASES.length - 1 && <span aria-hidden className={`hidden h-0.5 flex-1 sm:block ${done ? "bg-brand-600" : "bg-line"}`} />}
            </div>
            <div>
              <p className={`text-xs font-semibold leading-snug ${now ? "text-brand-800" : done ? "text-ink" : "text-muted"}`}>{td(`state.${p}`)}</p>
              {now && <p className="mt-0.5 text-xs text-muted">{overdue ? t("next.overdue") : t(`journey.expect.${p}`)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
