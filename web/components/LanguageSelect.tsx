"use client";
// One language menu for the app and the public pages: every listed language by its own name; the whole interface follows it.
import { Languages } from "lucide-react";
import { LANGUAGES, useI18n } from "@/lib/i18n";

export default function LanguageSelect({ className = "" }: { className?: string }) {
  const { t, lang, setLang } = useI18n();
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <Languages aria-hidden className="pointer-events-none absolute start-2.5 h-4 w-4 text-brand-700" />
      <select className="field h-9 w-auto max-w-[9.5rem] truncate ps-8 pe-7 text-sm font-semibold" value={lang} onChange={(e) => setLang(e.target.value)}
        aria-label={t("welcome.language")} data-testid="language-select">
        {LANGUAGES.filter((l) => !l.hidden || l.code === lang).map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
      </select>
    </label>
  );
}
