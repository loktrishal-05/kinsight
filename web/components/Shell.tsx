"use client";
import { useQuery } from "@tanstack/react-query";
import { Info, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { HOME, PERSONAS, useSession, type Persona } from "@/lib/session";
import { AssistantLauncher } from "./Assistant";
import CommandPalette from "./CommandPalette";
import LanguageSelect from "./LanguageSelect";
import SettingsMenu from "./SettingsMenu";
import { groupsFor, NAV_ITEMS } from "./nav";

export default function Shell({ children }: { children: ReactNode }) {
  const { t, lang, setLang, level, setLevel } = useI18n();
  const { persona, choose } = useSession();
  const path = usePathname();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  // After a client-side navigation, move focus to the new page so screen-reader and keyboard users start at its content.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    main.current?.focus();
  }, [path]);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const close = () => { setPalette(false); setOpen(false); };
    window.addEventListener("demo:close-overlays", close);
    return () => window.removeEventListener("demo:close-overlays", close);
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const visible = groupsFor(persona);
  // Rail mode: icons only, toggled with Ctrl+B and remembered on this device.
  const [rail, setRail] = useState(false);
  useEffect(() => { try { setRail(localStorage.getItem("ks_rail") === "1"); } catch { /* private mode */ } }, []);
  const toggleRail = () => setRail((r) => { try { localStorage.setItem("ks_rail", r ? "0" : "1"); } catch { /* private mode */ } return !r; });
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); toggleRail(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  // A count of what waits for the counsellor, shown on their menu entry.
  const pending = useQuery({ queryKey: ["review-queue"], queryFn: api.reviewQueue, enabled: persona === "counsellor", refetchInterval: 30_000 });
  const badges: Record<string, number> = { counsellor: (pending.data ?? []).filter((i) => i.state === "pending").length };
  const TABS = ["home", "result", "prepare", "ask"].map((k) => NAV_ITEMS.find((n) => n.key === k)!);
  const personTabs = persona === "person_a" || persona === "person_b";
  // The public landing page and sign-in stand outside the app chrome; the guided demo overlay still works on them.
  const bare = path === "/" || path === "/signin" || path === "/report-compare" || path.startsWith("/study");

  const personaSelect = (cls: string, id: string) => (
    <select id={id} className={`field ${cls}`} value={persona ?? ""} aria-label={t("welcome.persona")}
      onChange={async (e) => { const p = e.target.value as Persona; await choose(p); router.push(HOME[p]); }}>
      <option value="" disabled>{t("top.choose")}</option>
      {PERSONAS.map((p) => <option key={p} value={p}>{t(`persona.${p}`)}</option>)}
    </select>
  );

  const nav = (compact: boolean) => (
    <nav aria-label={t("nav.label")} data-demo="nav" className={`flex flex-col gap-6 py-5 ${compact ? "px-2" : "px-3"}`}>
      {visible.map((g) => (
        <div key={g.id}>
          <p className={compact ? "sr-only" : "eyebrow-free mb-1.5 px-3"}>{t(g.label)}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ key, href, icon: Icon, label }) => {
              const active = path.startsWith(href);
              return (
                <li key={key}>
                  <Link href={href} aria-current={active ? "page" : undefined} title={compact ? t(label ?? `nav.${key}`) : undefined}
                    className={`relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${compact ? "justify-center px-2" : "px-3"} ${active ? "bg-brand-50 text-brand-800 before:absolute before:inset-y-1.5 before:start-0 before:w-1 before:rounded-full before:bg-brand-600" : "text-ink/80 hover:bg-sunk"}`}>
                    <Icon aria-hidden className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand-600" : "text-muted"}`} />
                    <span className={compact ? "sr-only" : "flex-1"}>{t(label ?? `nav.${key}`)}</span>
                    {!!badges[key] && <span className={`chip bg-brand-600 text-onbrand ${compact ? "absolute -end-1 -top-1 px-1.5" : ""}`} data-demo={`badge-${key}`}>
                      {badges[key]}<span className="sr-only"> {t("shell.toReview")}</span></span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only z-50 rounded-lg bg-surface px-3 py-2 font-semibold focus:not-sr-only focus:fixed focus:start-3 focus:top-3">{t("a11y.skip")}</a>
      <div role="status" data-testid="fictional-banner" className="flex items-center justify-center gap-2 bg-deep px-4 py-1.5 text-center text-xs font-medium text-deepfg">
        <Info aria-hidden className="h-3.5 w-3.5 shrink-0" />{t("banner")}
      </div>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <button className="btn-quiet h-9 w-9 shrink-0 px-0 lg:hidden" aria-label={t("nav.menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
          <Link href="/home" className="flex items-center gap-2 text-lg font-bold tracking-tight text-brand-700">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-onbrand">K</span>
            <span className="sr-only sm:not-sr-only">{t("app")}</span>
          </Link>
          <button onClick={() => setPalette(true)} className="btn-quiet ms-2 hidden h-9 w-64 justify-between whitespace-nowrap px-3 font-normal text-muted md:flex">
            <span className="flex items-center gap-2"><Search aria-hidden className="h-4 w-4" />{t("palette.open")}</span>
            <kbd className="whitespace-nowrap rounded border border-line px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ms-auto flex items-center gap-2 sm:gap-3" data-demo="topbar">
            <label htmlFor="persona-top" className="hidden items-center gap-2 text-xs font-medium text-muted xl:flex">{t("top.viewing")}{personaSelect("h-9 w-44 py-0", "persona-top")}</label>
            <LanguageSelect />
            <div role="group" aria-label={t("welcome.level")} className="seg hidden sm:flex">
              {(["basic", "standard"] as const).map((l) => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>{t(`level.${l}`)}</button>)}
            </div>
            <SettingsMenu />
          </div>
        </div>
      </header>

      <div className={`lg:grid ${rail ? "lg:grid-cols-[4.5rem_minmax(0,1fr)]" : "lg:grid-cols-[16rem_minmax(0,1fr)]"}`}>
        <div className="hidden border-e border-line bg-surface lg:block">
          <aside className="sticky top-[5.5rem] h-[calc(100vh-5.5rem)] overflow-y-auto">
            <button type="button" onClick={toggleRail} aria-pressed={rail} title="Ctrl+B" data-demo="rail-toggle"
              className={`mx-3 mt-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-sunk ${rail ? "justify-center" : ""}`}>
              {rail ? <PanelLeftOpen aria-hidden className="h-4 w-4 rtl:rotate-180" /> : <PanelLeftClose aria-hidden className="h-4 w-4 rtl:rotate-180" />}
              <span className={rail ? "sr-only" : ""}>{t(rail ? "shell.expand" : "shell.collapse")}</span>
            </button>
            {nav(rail)}
          </aside>
        </div>
        <aside className={`${open ? "block" : "hidden"} fixed inset-x-0 bottom-0 top-[calc(2rem+3.5rem)] z-20 overflow-y-auto bg-surface lg:hidden`}>
          <div className="space-y-3 border-b border-line p-4">
            <label htmlFor="persona-menu" className="block text-xs font-medium text-muted">{t("top.viewing")}{personaSelect("mt-1", "persona-menu")}</label>
            <div role="group" aria-label={t("welcome.level")} className="seg sm:hidden">
              {(["basic", "standard"] as const).map((l) => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)} className="flex-1">{t(`level.${l}`)}</button>)}
            </div>
          </div>
          {nav(false)}
        </aside>
        <main id="main" ref={main} tabIndex={-1} className={`mx-auto w-full min-w-0 max-w-5xl px-4 py-6 outline-none sm:px-8 sm:py-8 ${personTabs ? "pb-24 lg:pb-8" : ""}`}>
          <div className="space-y-6">{children}</div>
          <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">{t("limits")}</footer>
        </main>
      </div>
      {personTabs && <nav aria-label={t("shell.tabs")} data-demo="tabbar" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        {TABS.map(({ key, href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return <Link key={key} href={href} aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-brand-700" : "text-muted"}`}>
            <Icon aria-hidden className="h-5 w-5" />{t(label ?? `nav.${key}`)}</Link>;
        })}
      </nav>}
      <AssistantLauncher lift={personTabs} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
