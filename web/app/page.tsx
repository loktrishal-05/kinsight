"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const PERSONAS = ["person_a", "person_b", "relative", "counsellor", "analyst", "auditor", "demo_operator"];

export default function Welcome() {
  const { t } = useI18n();
  const [who, setWho] = useState("");
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("app")}</h1>
      <p>{t("tagline")}</p>
      <p className="note">{t("welcome.intro")}</p>
      <div className="card">
        <h2 className="mb-2 font-medium">{t("welcome.persona")}</h2>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p) => (
            <button key={p} className={who === p ? "btn" : "btn-quiet"} aria-pressed={who === p} onClick={async () => setWho(await api.login(p))}>
              {t(`persona.${p}`)}
            </button>
          ))}
        </div>
        {who && <p className="mt-3"><Link className="underline" href={who === "counsellor" ? "/counsellor" : who === "analyst" ? "/analyst" : who === "auditor" ? "/governance" : "/result"}>→ {t(`persona.${who}`)}</Link></p>}
      </div>
    </section>
  );
}
