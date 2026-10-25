"use client";
import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, MOCK } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";

export default function SettingsMenu() {
  const { t, lang } = useI18n();
  const { prefs, set } = usePrefs();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);
  const seg = <T extends string | number>(label: string, value: T, opts: [T, string][], on: (v: T) => void) => (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted">{label}</p>
      <div role="group" aria-label={label} className="seg">
        {opts.map(([v, text]) => <button key={String(v)} aria-pressed={value === v} onClick={() => on(v)} className="flex-1">{text}</button>)}
      </div>
    </div>
  );
  const toggle = (label: string, on: boolean, f: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      {label}
      <input type="checkbox" role="switch" className="h-4 w-4 accent-[rgb(var(--b600))]" checked={on} onChange={(e) => f(e.target.checked)} />
    </label>
  );
  return (
    <div ref={box} className="relative">
      <button className="btn-quiet h-9 w-9 px-0" aria-label={t("settings.title")} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Settings aria-hidden className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div role="dialog" aria-label={t("settings.title")} className="absolute end-0 top-11 z-40 w-72 space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-lift">
          <h2 className="text-sm font-bold">{t("settings.title")}</h2>
          {seg(t("settings.theme"), prefs.theme, [["light", t("settings.light")], ["dark", t("settings.dark")], ["system", t("settings.system")]], (v) => set({ theme: v }))}
          {seg(t("settings.text"), prefs.text, [[0, "A"], [1, "A+"], [2, "A++"]], (v) => set({ text: v as 0 | 1 | 2 }))}
          {toggle(t("settings.contrast"), prefs.contrast, (v) => set({ contrast: v }))}
          {toggle(t("settings.motion"), prefs.reduceMotion, (v) => set({ reduceMotion: v }))}
          {MOCK && (
            <label className="block text-xs font-semibold text-muted">
              {t("settings.case")}
              <select className="field mt-1" value={api.scenario()} onChange={(e) => { api.setScenario(e.target.value); location.reload(); }}>
                {api.scenarios().map((s) => <option key={s.id} value={s.id}>{s.title[lang === "ar" ? "ar" : "en"]}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
