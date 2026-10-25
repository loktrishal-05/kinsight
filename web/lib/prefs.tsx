"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Comfort and accessibility settings, remembered per browser. Applied as attributes on <html>; see globals.css.
export type Prefs = { theme: "light" | "dark" | "system"; text: 0 | 1 | 2; contrast: boolean; reduceMotion: boolean };
const DEFAULT: Prefs = { theme: "light", text: 0, contrast: false, reduceMotion: false };
const Ctx = createContext<{ prefs: Prefs; set: (p: Partial<Prefs>) => void } | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem("ks_prefs"); if (raw) setPrefs({ ...DEFAULT, ...JSON.parse(raw) }); } catch { /* private mode or bad value */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const dark = prefs.theme === "dark" || (prefs.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const el = document.documentElement;
    el.dataset.theme = dark ? "dark" : "light";
    el.dataset.text = String(prefs.text);
    el.dataset.contrast = prefs.contrast ? "high" : "normal";
    el.dataset.motion = prefs.reduceMotion ? "reduce" : "normal";
    try { localStorage.setItem("ks_prefs", JSON.stringify(prefs)); } catch { /* private mode */ }
  }, [prefs, ready]);
  return <Ctx.Provider value={{ prefs, set: (p) => setPrefs((x) => ({ ...x, ...p })) }}>{children}</Ctx.Provider>;
}

export const usePrefs = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("PrefsProvider missing");
  return c;
};
