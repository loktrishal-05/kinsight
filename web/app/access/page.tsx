"use client";
import { Check, HandHelping } from "lucide-react";
import { useEffect, useState } from "react";
import { Notice, PageHeader } from "@/components/ui";
import directory from "@/lib/fixtures/services.json";
import { LANGUAGES, useI18n } from "@/lib/i18n";

// Access navigation (challenge requirement 2): generic service TYPES only, equal prominence, in id order.
// "Request a hand-off" is a stub: it records an intention in this browser session. It never names a facility,
// books anything, or claims availability.
const TYPES = ["confirmatory", "counselling", "primary", "specialist", "support"] as const;

export default function Access() {
  const { t } = useI18n();
  const [asked, setAsked] = useState<string[]>([]);
  useEffect(() => { try { setAsked(JSON.parse(sessionStorage.getItem("ks_handoff") ?? "[]")); } catch { /* private mode */ } }, []);
  const ask = (id: string) => {
    const next = asked.includes(id) ? asked : [...asked, id];
    setAsked(next);
    try { sessionStorage.setItem("ks_handoff", JSON.stringify(next)); } catch { /* private mode */ }
  };
  return (
    <section className="space-y-6">
      <PageHeader title={t("access.title")} lead={t("access.lead")} />
      <Notice>{t("access.disclaimer")}</Notice>
      <ul data-demo="services" className="card-flush divide-y divide-line">
        {TYPES.map((id) => (
          <li key={id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
            <div className="min-w-0 max-w-read">
              <h2 className="font-semibold">{t(`access.${id}.t`)}</h2>
              <p className="text-sm text-muted">{t(`access.${id}.d`)}</p>
              <p className="mt-1 text-xs text-muted">{t(`access.${id}.w`)}</p>
            </div>
            {asked.includes(id)
              ? <span className="chip bg-brand-50 text-brand-800" role="status"><Check aria-hidden className="h-3.5 w-3.5" />{t("access.recorded")}</span>
              : <button className="btn-quiet" data-demo="handoff" onClick={() => ask(id)}><HandHelping aria-hidden className="h-4 w-4" />{t("access.request")}</button>}
          </li>
        ))}
      </ul>
      {asked.length > 0 && <Notice>{t("access.after")}</Notice>}
      <section aria-labelledby="directory-title" className="space-y-3" data-demo="directory">
        <h2 id="directory-title" className="text-lg font-semibold">{t("dir.title")}</h2>
        <Notice>{t("dir.sample")}</Notice>
        <ul className="grid gap-3 sm:grid-cols-2">{directory.services.map((s) => (
          <li key={s.id} className="card space-y-1 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-semibold">{t(`access.${s.type}.t`)}{s.sample && <span className="chip bg-sunk">{t("dir.sampleChip")}</span>}</p>
            <p><span className="text-muted">{t("dir.languages")}:</span> {s.languages.map((c) => LANGUAGES.find((l) => l.code === c)?.name ?? c).join(", ")}</p>
            <p><span className="text-muted">{t("dir.cost")}:</span> {t(`dir.cost.${s.cost_band}`)} · <span className="text-muted">{t("dir.route")}:</span> {t(`dir.route.${s.booking_route}`)}</p>
            <p className="text-xs text-muted">{s.last_verified ? `${t("dir.verified")}: ${s.last_verified}` : t("dir.unverified")}</p>
          </li>))}</ul>
      </section>
    </section>
  );
}
