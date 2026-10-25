"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

export type Lang = "en" | "ar";
export type Level = "basic" | "standard";
const MSG: Record<Lang, Record<string, string>> = { en, ar };

type Ctx = { lang: Lang; level: Level; setLang: (l: Lang) => void; setLevel: (l: Level) => void; t: (k: string) => string };
const I18n = createContext<Ctx | null>(null);

const read = (k: string, d: string) => {
  try { return localStorage.getItem(k) ?? d; } catch { return d; }
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [level, setLevel] = useState<Level>("standard");
  useEffect(() => { setLang(read("ks_lang", "en") as Lang); setLevel(read("ks_level", "standard") as Level); }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; // dir per language
    try { localStorage.setItem("ks_lang", lang); localStorage.setItem("ks_level", level); } catch { /* private mode */ }
  }, [lang, level]);
  const t = (k: string) => MSG[lang][k] ?? MSG.en[k] ?? k;
  return <I18n.Provider value={{ lang, level, setLang, setLevel, t }}>{children}</I18n.Provider>;
}

export const useI18n = () => {
  const c = useContext(I18n);
  if (!c) throw new Error("I18nProvider missing");
  return c;
};
