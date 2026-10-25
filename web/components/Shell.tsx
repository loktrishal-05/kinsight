"use client";
import { BarChart3, BookOpenCheck, Compass, FileText, Home, Info, ClipboardList, Menu, MessageCircle, Network, Scale, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { HOME, PERSONAS, useSession, type Persona } from "@/lib/session";

type Item = { key: string; href: string; icon: typeof Home };
const GROUPS: { id: string; label: string; items: Item[]; roles: Persona[] | "all" }[] = [
  { id: "start", label: "group.start", roles: "all", items: [{ key: "home", href: "/", icon: Home }] },
  { id: "care", label: "group.care", roles: ["person_a", "person_b", "demo_operator"], items: [
    { key: "result", href: "/result", icon: FileText }, { key: "couple", href: "/couple", icon: Users },
    { key: "understand", href: "/understand", icon: BookOpenCheck }, { key: "next", href: "/next", icon: Compass },
    { key: "family", href: "/family", icon: Network }, { key: "consents", href: "/consents", icon: ShieldCheck },
    { key: "ask", href: "/ask", icon: MessageCircle }] },
  { id: "relative", label: "group.care", roles: ["relative"], items: [{ key: "family", href: "/family", icon: Network }] },
  { id: "team", label: "group.team", roles: ["counsellor", "demo_operator"], items: [{ key: "counsellor", href: "/counsellor", icon: ClipboardList }] },
  { id: "insight", label: "group.insight", roles: ["analyst", "auditor", "demo_operator"], items: [
    { key: "analyst", href: "/analyst", icon: BarChart3 }, { key: "governance", href: "/governance", icon: Scale }] },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { t, lang, setLang, level, setLevel } = useI18n();
  const { persona, choose } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const visible = GROUPS.filter((g) => g.roles === "all" || !persona || g.roles.includes(persona));

  const nav = (
    <nav aria-label={t("nav.label")} className="flex flex-col gap-6 px-3 py-5">
      {visible.map((g) => (
        <div key={g.id}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted">{t(g.label)}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ key, href, icon: Icon }) => {
              const active = href === "/" ? path === "/" : path.startsWith(href);
              return (
                <li key={key}>
                  <Link href={href} aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-brand-50 text-brand-800" : "text-ink/80 hover:bg-canvas"}`}>
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

  return (
    <div className="min-h-screen">
      <div role="status" data-testid="fictional-banner" className="flex items-center justify-center gap-2 bg-brand-800 px-4 py-1.5 text-center text-xs font-medium text-brand-50">
        <Info aria-hidden className="h-3.5 w-3.5 shrink-0" />{t("banner")}
      </div>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <button className="btn-quiet h-9 w-9 shrink-0 px-0 lg:hidden" aria-label={t("nav.menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-brand-700">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">K</span>
            <span className="hidden sm:inline">{t("app")}</span>
          </Link>
          <div className="ms-auto flex items-center gap-2 sm:gap-3">
            <label className="hidden items-center gap-2 text-xs font-medium text-muted md:flex">
              {t("top.viewing")}
              <select className="field h-9 w-44 py-0" value={persona ?? ""} aria-label={t("welcome.persona")}
                onChange={async (e) => { const p = e.target.value as Persona; await choose(p); router.push(HOME[p]); }}>
                <option value="" disabled>{t("top.choose")}</option>
                {PERSONAS.map((p) => <option key={p} value={p}>{t(`persona.${p}`)}</option>)}
              </select>
            </label>
            <div role="group" aria-label={t("welcome.language")} className="flex rounded-lg border border-line p-0.5">
              {LANGUAGES.filter((l) => !("hidden" in l && l.hidden)).map((l) => (
                <button key={l.code} aria-pressed={lang === l.code} aria-label={l.name} title={l.name} onClick={() => setLang(l.code)}
                  className={`h-8 rounded-md px-2.5 text-xs font-bold transition-colors ${lang === l.code ? "bg-brand-600 text-white" : "text-ink/70 hover:bg-canvas"}`}>
                  {l.short}
                </button>
              ))}
            </div>
            <div role="group" aria-label={t("welcome.level")} className="hidden rounded-lg border border-line p-0.5 sm:flex">
              {(["basic", "standard"] as const).map((l) => (
                <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}
                  className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${level === l ? "bg-brand-600 text-white" : "text-ink/70 hover:bg-canvas"}`}>
                  {t(`level.${l}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[calc(2rem+3.5rem)] bottom-0 z-20 overflow-y-auto border-e border-line bg-surface lg:sticky lg:top-[5.5rem] lg:block lg:h-[calc(100vh-5.5rem)] lg:w-64`}>
          <div className="space-y-3 border-b border-line p-4 lg:hidden">
            <label className="block text-xs font-medium text-muted">
              {t("top.viewing")}
              <select className="field mt-1" value={persona ?? ""} aria-label={t("welcome.persona")}
                onChange={async (e) => { const p = e.target.value as Persona; await choose(p); router.push(HOME[p]); }}>
                <option value="" disabled>{t("top.choose")}</option>
                {PERSONAS.map((p) => <option key={p} value={p}>{t(`persona.${p}`)}</option>)}
              </select>
            </label>
            <div role="group" aria-label={t("welcome.level")} className="flex rounded-lg border border-line p-0.5">
              {(["basic", "standard"] as const).map((l) => (
                <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}
                  className={`h-8 flex-1 rounded-md text-xs font-semibold ${level === l ? "bg-brand-600 text-white" : "text-ink/70"}`}>{t(`level.${l}`)}</button>
              ))}
            </div>
          </div>
          {nav}
        </aside>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
          <div className="space-y-6">{children}</div>
          <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">{t("limits")}</footer>
        </main>
      </div>
    </div>
  );
}
