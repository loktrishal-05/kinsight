"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { LANGUAGES, useI18n } from "@/lib/i18n";

const NAV = [["home", "/"], ["result", "/result"], ["couple", "/couple"], ["understand", "/understand"], ["consents", "/consents"],
  ["family", "/family"], ["next", "/next"], ["ask", "/ask"], ["counsellor", "/counsellor"], ["analyst", "/analyst"], ["governance", "/governance"]];

export default function Shell({ children }: { children: ReactNode }) {
  const { t, lang, setLang, level, setLevel } = useI18n();
  return (
    <>
      <div role="status" className="bg-note px-4 py-2 text-center text-sm font-medium" data-testid="fictional-banner">{t("banner")}</div>
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-semibold text-accent">{t("app")}</Link>
        <div className="flex gap-2" role="group" aria-label={t("welcome.language")}>
          {LANGUAGES.map((l) => (
            <button key={l.code} className={lang === l.code ? "btn" : "btn-quiet"} aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>{l.label}</button>
          ))}
          <button className="btn-quiet" aria-label={t("welcome.level")} onClick={() => setLevel(level === "basic" ? "standard" : "basic")}>
            {t(`level.${level}`)}
          </button>
        </div>
      </header>
      <nav aria-label="Main" className="mx-auto max-w-5xl overflow-x-auto px-4">
        <ul className="flex gap-1 whitespace-nowrap pb-2 text-sm">
          {NAV.map(([k, href]) => (
            <li key={k}><Link className="inline-block rounded px-3 py-1 hover:bg-white" href={href}>{t(`nav.${k}`)}</Link></li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-600">{t("limits")}</footer>
    </>
  );
}
