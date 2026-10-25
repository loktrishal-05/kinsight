"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import en from "@/messages/en.json";
import languages from "@/messages/languages.json";

// A new language = a messages/<code>.json file plus one line in messages/languages.json. No code changes.
export type Lang = string;
export type Level = "basic" | "standard";
export const LANGUAGES = languages as { code: string; label: string; dir: "ltr" | "rtl" }[];
type Msgs = Record<string, string>;

type Ctx = { lang: Lang; level: Level; setLang: (l: Lang) => void; setLevel: (l: Level) => void; t: (k: string) => string };
const I18n = createContext<Ctx | null>(null);

const read = (k: string, d: string) => {
  try { return localStorage.getItem(k) ?? d; } catch { return d; }
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [level, setLevel] = useState<Level>("standard");
  const [msgs, setMsgs] = useState<Msgs>(en as Msgs);
  const [ready, setReady] = useState(false); // do not overwrite the stored preference before it is read
  useEffect(() => { setLang(read("ks_lang", "en")); setLevel(read("ks_level", "standard") as Level); setReady(true); }, []);
  useEffect(() => {
    if (!ready) return;
    const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir; // dir per language
    try { localStorage.setItem("ks_lang", lang); localStorage.setItem("ks_level", level); } catch { /* private mode */ }
    let live = true;
    import(`@/messages/${lang}.json`).then((m) => live && setMsgs(m.default as Msgs)).catch(() => live && setMsgs(en as Msgs));
    return () => { live = false; };
  }, [lang, level, ready]);
  const t = (k: string) => msgs[k] ?? (en as Msgs)[k] ?? k;
  return <I18n.Provider value={{ lang, level, setLang, setLevel, t }}>{children}</I18n.Provider>;
}

export const useI18n = () => {
  const c = useContext(I18n);
  if (!c) throw new Error("I18nProvider missing");
  return c;
};
