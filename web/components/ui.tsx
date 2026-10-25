"use client";
import { Check, CircleDashed, HelpCircle, Minus } from "lucide-react";
import type { ReactNode } from "react";
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
