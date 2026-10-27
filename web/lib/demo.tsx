"use client";
// Guided demo runtime: plays STEPS one by one, performing each step's real action, spotlighting its target and narrating it.
// Start it from the hero, the top bar, the search palette, or by opening any page with ?demo=1. Space pauses, arrows step, Esc stops.
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, MOCK } from "./api";
import { STEPS, waitFor, sleep, type Ctx } from "./demoScript";
import { useI18n } from "./i18n";
import { usePrefs } from "./prefs";
import { useSession } from "./session";
import { speak, stopSpeaking } from "./voice";

type Demo = {
  available: boolean; active: boolean; done: boolean; index: number; playing: boolean; speed: number; voice: boolean; demoLang: "en" | "ar";
  start: (lang?: "en" | "ar") => void; stop: () => void; next: () => void; prev: () => void; toggle: () => void;
  setSpeed: (s: number) => void; setVoice: (v: boolean) => void; setDemoLang: (l: "en" | "ar") => void; restart: () => void;
};
const C = createContext<Demo | null>(null);
const fast = () => { try { return localStorage.getItem("ks_demo_fast") === "1"; } catch { return false; } };

export function DemoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { setLang, setLevel } = useI18n();
  const { set: setPrefs } = usePrefs();
  const { persona, choose } = useSession();
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState(false);
  const [demoLang, setDemoLangState] = useState<"en" | "ar">("en");
  const token = useRef(0);
  const live = useRef({ playing, speed, voice, path, persona, demoLang });
  live.current = { playing, speed, voice, path, persona, demoLang };

  const log = (note: string) => { const w = window as any; (w.__demoLog ??= []).push(note); };

  const runStep = useCallback(async (i: number) => {
    const my = ++token.current;
    const alive = () => token.current === my;
    const s = STEPS[i];
    const quick = fast();
    log(`step:${s.id}`);
    window.dispatchEvent(new Event("demo:close-overlays"));
    if (s.persona && live.current.persona !== s.persona) await choose(s.persona);
    if (s.route && live.current.path !== s.route) router.push(s.route);
    if (s.target && !["palette-dialog", "kin-panel", "settings-panel", "quiz-msg"].includes(s.target)) await waitFor(`[data-demo="${s.target}"]`, 6000);
    if (!alive()) return;
    await sleep(quick ? 150 : 500);
    if (!alive()) return; // skipped during the pause: a stale action must not reopen overlays the next step closed
    const ctx: Ctx = {
      lang: live.current.demoLang, go: (h) => router.push(h), choose, setLang: (l) => setLang(l), setLevel, api,
      setTheme: (t) => setPrefs({ theme: t }), setText: (n) => setPrefs({ text: n }), log,
    };
    try { await s.run?.(ctx); } catch (e) { log(`error:${s.id}:${String(e)}`); }
    if (!alive()) return;
    const el = s.target ? await waitFor(`[data-demo="${s.target}"]`, 2500) : null;
    // Align to the top so the free space, where the caption card sits, is below the target.
    el?.scrollIntoView({ block: "start", behavior: quick ? "auto" : "smooth" });
    const text = s.text[live.current.demoLang];
    const dwell = quick ? 250 : Math.min(13000, Math.max(5000, text.length * 60)) / live.current.speed;
    const t0 = Date.now();
    if (live.current.voice && !quick) await speak(text, live.current.demoLang);
    while (alive() && (Date.now() - t0 < dwell || !live.current.playing)) await sleep(100);
    if (!alive()) return;
    if (i + 1 < STEPS.length) setIndex(i + 1);
    else { setDone(true); log("demo:done"); }
  }, [choose, router, setLang, setLevel, setPrefs]);

  // Run each step exactly once per index change (callbacks change identity on every render, so keep them in a ref).
  const runRef = useRef(runStep);
  runRef.current = runStep;
  useEffect(() => { if (active && !done) void runRef.current(index); }, [active, done, index]);

  const start = useCallback((lang?: "en" | "ar") => {
    if (lang) { setDemoLangState(lang); setLang(lang); }
    (window as any).__demoLog = [];
    setDone(false); setIndex(0); setPlaying(true); setActive(true);
  }, [setLang]);
  const stop = useCallback(() => { token.current++; stopSpeaking(); setActive(false); setDone(false); window.dispatchEvent(new Event("demo:close-overlays")); }, []);
  const next = useCallback(() => { stopSpeaking(); if (index + 1 < STEPS.length) setIndex(index + 1); else { token.current++; setDone(true); } }, [index]);
  const prev = useCallback(() => { stopSpeaking(); setIndex(Math.max(0, index - 1)); }, [index]);
  const toggle = useCallback(() => { setPlaying((p) => { if (p) stopSpeaking(); return !p; }); }, []);

  useEffect(() => { // the search palette and other places start the demo with an event
    const go = () => start();
    window.addEventListener("demo:start", go);
    return () => window.removeEventListener("demo:start", go);
  }, [start]);
  useEffect(() => { // ?demo=1 (or ?demo=ar) starts the demo on load
    if (!MOCK) return;
    const q = new URLSearchParams(location.search).get("demo");
    if (q) start(q === "ar" ? "ar" : "en");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "");
      if (typing || !e.isTrusted) return;
      if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") prev(); else if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, toggle, next, prev, stop]);

  const value: Demo = {
    available: MOCK, active, done, index, playing, speed, voice, demoLang, start, stop, next, prev, toggle, setSpeed, setVoice,
    setDemoLang: (l) => { setDemoLangState(l); setLang(l); }, restart: () => start(demoLang),
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useDemo = () => {
  const c = useContext(C);
  if (!c) throw new Error("DemoProvider missing");
  return c;
};
