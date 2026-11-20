"use client";

import Link from "next/link";
import { useState } from "react";
import { Notice, PageHeader } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

const topics = ["prepare", "spacing", "inheritance", "fertility", "values"] as const;
const regions = ["general", "abuDhabi", "saudi"] as const;
type Region = (typeof regions)[number];
const services = {
  general: [],
  abuDhabi: [
    { key: "adphc", url: "https://www.adphc.gov.ae/en/Public-Health-Programs/Premarital-Screening" },
    { key: "seha", url: "https://www.seha.ae/public/faq" },
    { key: "doh", url: "https://www.doh.gov.ae/en/programs-initiatives/ART%20Program" },
  ],
  saudi: [
    { key: "saudiScreening", url: "https://www.moh.gov.sa/en/eservices/pages/premarital-screening.aspx" },
    { key: "saudiPregnancy", url: "https://www.moh.gov.sa/en/awarenessplateform/womenshealth/pages/beforepregnancy.aspx" },
  ],
} as const;

export default function FamilyPlanning() {
  const { t, lang } = useI18n();
  const [region, setRegion] = useState<Region>("general");
  const text = (key: string) => t(`familyPlanning.${key}`);

  return (
    <div className="space-y-6" lang={lang === "ar" ? "ar" : "en"}>
      <PageHeader title={text("title")} lead={text("lead")} />
      <Notice>{text("scope")}</Notice>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-3" aria-labelledby="planning-topics">
          <h2 id="planning-topics" className="text-lg font-semibold">{text("topics")}</h2>
          {topics.map((topic) => (
            <details key={topic} className="card py-3">
              <summary className="cursor-pointer rounded py-1 font-semibold">{text(`${topic}.title`)}</summary>
              <div className="space-y-3 pt-2 text-sm">
                <p className="text-muted">{text(`${topic}.body`)}</p>
                <p className="rounded-lg bg-sunk p-3">
                  <strong className="mb-1 block">{text("ask")}</strong>
                  {text(`${topic}.question`)}
                </p>
              </div>
            </details>
          ))}
        </section>

        <section className="card space-y-4" aria-labelledby="planning-services">
          <h2 id="planning-services" className="text-lg font-semibold">{text("services")}</h2>
          <label className="block" htmlFor="planning-region">
            {text("region")}
            <select id="planning-region" className="field mt-1" value={region}
              onChange={(event) => setRegion(event.currentTarget.value as Region)}>
              {regions.map((value) => <option key={value} value={value}>{text(`region.${value}`)}</option>)}
            </select>
          </label>
          <div className="space-y-3 text-sm">
            <p className="text-muted" aria-live="polite">{text(`service.${region}`)}</p>
            {services[region].length > 0 && (
              <ul className="space-y-2">
                {services[region].map(({ key, url }) => (
                  <li key={key}><a className="underline underline-offset-4" href={url} rel="noreferrer">{text(`source.${key}`)}</a></li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="card space-y-3" aria-labelledby="planning-prepare">
        <h2 id="planning-prepare" className="text-lg font-semibold">{text("next")}</h2>
        <p className="text-sm text-muted">{text("privacy")}</p>
        <Link className="btn-quiet h-auto min-h-10 py-2" href="/prepare" lang={lang}>{t("prep.link")}</Link>
      </section>

      <section aria-labelledby="planning-sources" className="space-y-2 text-sm">
        <h2 id="planning-sources" className="font-semibold">{text("sources")}</h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li><a className="underline underline-offset-4" rel="noreferrer" href="https://www.cdc.gov/pregnancy/about/">{text("source.cdc")}</a></li>
          <li><a className="underline underline-offset-4" rel="noreferrer" href="https://www.who.int/news-room/fact-sheets/detail/family-planning-contraception">{text("source.who")}</a></li>
          <li><a className="underline underline-offset-4" rel="noreferrer" href="https://www.cdc.gov/genomics-and-health/about/genetic-disorders.html">{text("source.genetics")}</a></li>
        </ul>
      </section>
    </div>
  );
}
