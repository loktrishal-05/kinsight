"use client";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { HOME, PERSONAS, useSession } from "@/lib/session";

const GROUPS: { label: string; ids: readonly (typeof PERSONAS)[number][] }[] = [
  { label: "welcome.asPerson", ids: ["person_a", "person_b", "relative"] },
  { label: "welcome.asPro", ids: ["counsellor", "analyst", "auditor", "demo_operator"] },
];

export default function Welcome() {
  const { t } = useI18n();
  const { persona, choose } = useSession();
  const router = useRouter();
  return (
    <section className="space-y-8">
      <div className="max-w-read space-y-3">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{t("welcome.title")}</h1>
        <p className="text-[1.05rem] text-muted">{t("tagline")}</p>
        <Notice>{t("welcome.intro")}</Notice>
      </div>
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">{t("welcome.pick")}</h2>
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t(g.label)}</p>
            <ul className="card-flush divide-y divide-line">
              {g.ids.map((p) => (
                <li key={p}>
                  <button onClick={async () => { await choose(p); router.push(HOME[p]); }}
                    aria-pressed={persona === p}
                    className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition-colors hover:bg-brand-50 ${persona === p ? "bg-brand-50" : ""}`}>
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
    </section>
  );
}
