"use client";
import { Check, CircleDashed, HelpCircle, Minus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { EstimateInfo } from "@/lib/estimate";
import { useI18n } from "@/lib/i18n";

export function PageHeader({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h-page">{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

// Carrier status uses neutral colours and plain words ("found" / "not found"), never positive/negative or alarm colours.
export function StatusChip({ status }: { status: "carrier" | "not_detected" | "uncertain" }) {
  const { t } = useI18n();
  const map = {
    carrier: { cls: "bg-found-bg text-found-fg", Icon: Check, label: t("result.found") },
    not_detected: { cls: "bg-clear-bg text-clear-fg", Icon: Minus, label: t("result.notfound") },
    uncertain: { cls: "bg-unsure-bg text-unsure-fg", Icon: HelpCircle, label: t("result.unclear") },
  }[status];
  return <span className={`chip ${map.cls}`}><map.Icon aria-hidden className="h-3.5 w-3.5" />{map.label}</span>;
}

export function Notice({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <p className="note" role="note">{icon ?? <CircleDashed aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}<span>{children}</span></p>;
}

export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Progress">
      {labels.map((l, i) => (
        <li key={l} aria-current={i === current ? "step" : undefined}
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${i < current ? "border-brand-200 bg-brand-50 text-brand-800" : i === current ? "border-brand-600 bg-brand-600 text-white" : "border-line text-muted"}`}>
          {i < current ? <Check aria-hidden className="h-3.5 w-3.5" /> : <span aria-hidden>{i + 1}</span>}{l}
        </li>
      ))}
    </ol>
  );
}

// Every risk number is wrapped here so the label sits next to it, not only in the footer. The API sends the envelope;
// text that came from a verified template (explanations, Kin replies) has no envelope, so it points at /methods.
type EstimateRef = Pick<EstimateInfo, "basis" | "method_url">;
export const ABOUT_ESTIMATES: EstimateRef = { basis: "estimates", method_url: "/methods" };
export const hasFigure = (text: string) => /\d\s?%|%\s?\d|\d+ (?:in|of|من|में|ல்|இல்|లో|ರಲ್ಲಿ|ರ|ൽ) \d+/i.test(text);

export function Estimate({ est, children, block = false }: { est: EstimateRef; children: ReactNode; block?: boolean }) {
  const { t } = useI18n();
  return (
    <span data-estimate className={block ? "block" : "inline-flex flex-col"}>
      {children}
      <span className={`${block ? "block " : ""}text-xs font-normal text-muted`}>
        {t("estimate.label")} · <Link className="underline" href={`${est.method_url}#${est.basis}`}>{t("estimate.how")}</Link>
      </span>
    </span>
  );
}

// Explanation paragraphs: any paragraph carrying a figure gets the label right under it.
export function Paragraphs({ blocks }: { blocks: string[] }) {
  return <>{blocks.map((b, i) => hasFigure(b) ? <p key={i}><Estimate est={ABOUT_ESTIMATES} block>{b}</Estimate></p> : <p key={i}>{b}</p>)}</>;
}

// Shared states (docs: web/DESIGN.md, "States"). Skeletons hold the layout while data loads; errors say what happened
// in plain words and offer a retry where one makes sense; empty states explain what will appear and how.
export function Skeleton({ lines = 3 }: { lines?: number }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t("loading")} className="space-y-2" data-demo="skeleton">
      {Array.from({ length: lines }, (_, i) => <span key={i} aria-hidden className="block h-4 animate-pulse rounded bg-sunk" style={{ width: `${92 - i * 14}%` }} />)}
    </div>
  );
}

export function ErrorState({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="note flex flex-wrap items-center gap-3" data-demo="error-state">
      <span className="flex-1">{children}</span>
      {onRetry && <button type="button" className="btn-quiet btn-sm" onClick={onRetry}>{t("states.retry")}</button>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center" data-demo="empty-state">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}
