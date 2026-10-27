"use client";
import { Info, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { HOME, PERSONAS, useSession, type Persona } from "@/lib/session";
import { AssistantLauncher } from "./Assistant";
import DemoOverlay from "./DemoOverlay";
import { useDemo } from "@/lib/demo";
import { PlayCircle } from "lucide-react";
import CommandPalette from "./CommandPalette";
import LanguageSelect from "./LanguageSelect";
import SettingsMenu from "./SettingsMenu";
import { GROUPS } from "./nav";

export default function Shell({ children }: { children: ReactNode }) {
  const { t, lang, setLang, level, setLevel } = useI18n();
  const { persona, choose } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const demo = useDemo();
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
  const visible = GROUPS.filter((g) => g.roles === "all" || !persona || g.roles.includes(persona));
  // The public landing page and sign-in stand outside the app chrome; the guided demo overlay still works on them.
  const bare = path === "/" || path === "/signin";

  const personaSelect = (cls: string) => (
    <select className={`field ${cls}`} value={persona ?? ""} aria-label={t("welcome.persona")}
      onChange={async (e) => { const p = e.target.value as Persona; await choose(p); router.push(HOME[p]); }}>
      <option value="" disabled>{t("top.choose")}</option>
      {PERSONAS.map((p) => <option key={p} value={p}>{t(`persona.${p}`)}</option>)}
    </select>
  );

  const nav = (
    <nav aria-label={t("nav.label")} data-demo="nav" className="flex flex-col gap-6 px-3 py-5">
      {visible.map((g) => (
        <div key={g.id}>
          <p className="eyebrow-free mb-1.5 px-3">{t(g.label)}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ key, href, icon: Icon }) => {
              const active = path.startsWith(href);
              return (
                <li key={key}>
                  <Link href={href} aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-brand-50 text-brand-800" : "text-ink/80 hover:bg-sunk"}`}>
                    <Icon aria-hidden className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand-600" : "text-muted"}`} />
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  if (bare) return <>{children}<DemoOverlay /></>;

  return (
    <div className="min-h-screen">
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
            <span className="hidden sm:inline">{t("app")}</span>
          </Link>
          <button onClick={() => setPalette(true)} className="btn-quiet ms-2 hidden h-9 w-64 justify-between whitespace-nowrap px-3 font-normal text-muted md:flex" aria-label={t("palette.title")}>
            <span className="flex items-center gap-2"><Search aria-hidden className="h-4 w-4" />{t("palette.open")}</span>
            <kbd className="whitespace-nowrap rounded border border-line px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ms-auto flex items-center gap-2 sm:gap-3" data-demo="topbar">
            {demo.available && !demo.active && (
              <button className="btn-quiet h-9 px-3" onClick={() => demo.start()} data-testid="demo-start-top" title={t("demo.start")}>
                <PlayCircle aria-hidden className="h-4 w-4 text-brand-600" /><span className="hidden lg:inline">{t("demo.short")}</span>
              </button>
            )}
            <label className="hidden items-center gap-2 text-xs font-medium text-muted xl:flex">{t("top.viewing")}{personaSelect("h-9 w-44 py-0")}</label>
            <LanguageSelect />
            <div role="group" aria-label={t("welcome.level")} className="seg hidden sm:flex">
              {(["basic", "standard"] as const).map((l) => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>{t(`level.${l}`)}</button>)}
            </div>
            <SettingsMenu />
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="hidden border-e border-line bg-surface lg:block">
          <aside className="sticky top-[5.5rem] h-[calc(100vh-5.5rem)] overflow-y-auto">{nav}</aside>
        </div>
        <aside className={`${open ? "block" : "hidden"} fixed inset-x-0 bottom-0 top-[calc(2rem+3.5rem)] z-20 overflow-y-auto bg-surface lg:hidden`}>
          <div className="space-y-3 border-b border-line p-4">
            <label className="block text-xs font-medium text-muted">{t("top.viewing")}{personaSelect("mt-1")}</label>
            <div role="group" aria-label={t("welcome.level")} className="seg sm:hidden">
              {(["basic", "standard"] as const).map((l) => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)} className="flex-1">{t(`level.${l}`)}</button>)}
            </div>
          </div>
          {nav}
        </aside>
        <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
          <div className="space-y-6">{children}</div>
          <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">{t("limits")}</footer>
        </main>
      </div>
      <AssistantLauncher />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <DemoOverlay />
    </div>
  );
}
