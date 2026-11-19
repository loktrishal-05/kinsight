"use client";
import { useEffect, useState } from "react";
import { MOCK } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type State = "checking" | "online" | "degraded" | "waking" | "offline" | "demo";

// A one-line public status for visitors and judges: is the live service up, still waking (free hosting sleeps), or down?
export default function StatusLine() {
  const { t } = useI18n();
  const [state, setState] = useState<State>(MOCK ? "demo" : "checking");
  useEffect(() => {
    if (MOCK) return;
    const slow = window.setTimeout(() => setState((s) => (s === "checking" ? "waking" : s)), 3000);
    const stop = new AbortController();
    const hard = window.setTimeout(() => stop.abort(), 75_000);
    fetch("/api/health", { signal: stop.signal })
      .then(async (r) => setState(r.ok ? ((await r.json()).database_reachable === false ? "degraded" : "online") : "offline"))
      .catch(() => setState("offline"))
      .finally(() => { window.clearTimeout(slow); window.clearTimeout(hard); });
    return () => { stop.abort(); window.clearTimeout(slow); window.clearTimeout(hard); };
  }, []);
  const dot = { online: "bg-brand-600", demo: "bg-brand-600", checking: "bg-line", waking: "bg-unsure-fg", degraded: "bg-unsure-fg", offline: "bg-unsure-fg" }[state];
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2" data-testid="status-line">
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />{t(`status.${state}`)}
    </p>
  );
}
