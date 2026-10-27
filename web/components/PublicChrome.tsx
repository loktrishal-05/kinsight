"use client";
// Brand mark and language switch shared by the public pages (landing and sign-in), which sit outside the app shell.
import Link from "next/link";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-brand-800">
      <img src="/kin-logo.png" alt="" className="h-8 w-8 rounded-lg" />KinSight
    </Link>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div role="group" aria-label="Language" className="seg">
      {LANGUAGES.filter((l) => !l.hidden).map((l) => <button key={l.code} aria-pressed={lang === l.code} onClick={() => setLang(l.code as Lang)}>{l.short}</button>)}
    </div>
  );
}
