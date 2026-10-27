"use client";
import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, MOCK } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { GLOSSARY } from "@/lib/learn";
import { NAV_ITEMS } from "./nav";

type Entry = { id: string; label: string; hint: string; run: () => void };

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setI(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);

  const all = useMemo<Entry[]>(() => {
    const go = (href: string) => () => { router.push(href); onClose(); };
    const pages = NAV_ITEMS.map((n) => ({ id: `p-${n.key}`, label: t(`nav.${n.key}`), hint: t("palette.page"), run: go(n.href) }));
    const terms = GLOSSARY.map((g) => ({ id: `g-${g.id}`, label: g.term[lang], hint: t("palette.term"), run: go(`/learn#${g.id}`) }));
    const cases = MOCK ? api.scenarios().map((s) => ({ id: `s-${s.id}`, label: t(`scen.${s.id}.title`), hint: t("palette.case"),
      run: () => { api.setScenario(s.id); router.push("/result"); onClose(); setTimeout(() => location.reload(), 50); } })) : [];
    const kin = { id: "kin", label: t("assistant.open"), hint: t("palette.page"), run: () => { window.dispatchEvent(new Event("kin:toggle")); onClose(); } };
    const tour = { id: "demo", label: t("demo.start"), hint: t("palette.page"), run: () => { onClose(); window.dispatchEvent(new Event("demo:start")); } };
    return [tour, kin, ...pages, ...terms, ...cases];
  }, [t, lang, router, onClose]);

  const list = all.filter((e) => e.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 9);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-ink/40 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose} data-noprint>
      <div role="dialog" aria-modal="true" aria-label={t("palette.title")} data-demo="palette-dialog" className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, list.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
          if (e.key === "Enter") list[i]?.run();
        }}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search aria-hidden className="h-4 w-4 text-muted" />
          <input ref={input} data-demo="palette-input" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder={t("palette.placeholder")} aria-label={t("palette.title")}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70" />
          <kbd className="rounded border border-line px-1.5 text-[10px] text-muted">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">{t("palette.none")}</li>}
          {list.map((e, n) => (
            <li key={e.id} role="option" aria-selected={n === i}>
              <button onClick={e.run} onMouseEnter={() => setI(n)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm ${n === i ? "bg-brand-50 text-brand-800" : ""}`}>
                <span>{e.label}</span>
                <span className="flex items-center gap-2 text-xs text-muted">{e.hint}{n === i && <CornerDownLeft aria-hidden className="h-3 w-3" />}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
