"use client";
import { useQuery } from "@tanstack/react-query";
import { Mic, MicOff, SendHorizontal, Square, Volume2, VolumeX, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, MOCK } from "@/lib/api";
import { answer, detectLang, suggestions, type Lang, type Link as L } from "@/lib/assistant";
import { useI18n } from "@/lib/i18n";
import { BCP47, canListen, canSpeak, listen, speak, stopSpeaking } from "@/lib/voice";

type Msg = { id: number; role: "you" | "kin"; text: string; lang: Lang; links?: L[]; refused?: boolean; voice?: boolean };
type Mode = "auto" | Lang;

export function KinLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  // Generated logo (Canva) with an inline vector fallback if the file is missing.
  const [bad, setBad] = useState(false);
  return bad ? (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className={className}>
      <path d="M8 10a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H20l-9 8v-8a8 8 0 0 1-3-6z" fill="rgb(var(--b600))" />
      <circle cx="22" cy="14" r="3.2" fill="#fff" /><circle cx="16" cy="25" r="3.2" fill="#fff" /><circle cx="28" cy="25" r="3.2" fill="#fff" />
    </svg>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/kin-logo.png" alt="" width={size} height={size} aria-hidden className={`scale-[1.35] object-contain ${className}`} onError={() => setBad(true)} />
  );
}

export function AssistantPanel({ mode: layout, onClose }: { mode: "float" | "page"; onClose?: () => void }) {
  const { t, lang: uiLang, level } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("auto");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [note, setNote] = useState("");
  const stopRef = useRef<() => void>(() => {});
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const expl = useQuery({ queryKey: ["expl", uiLang, level], queryFn: () => api.explanation(uiLang, level) });
  const cons = useQuery({ queryKey: ["consents"], queryFn: api.consents });
  const fallback: Lang = mode === "auto" ? (uiLang === "ar" ? "ar" : "en") : mode;
  const micLang: Lang = mode === "auto" ? fallback : mode;

  useEffect(() => {
    try { const raw = sessionStorage.getItem("ks_chat"); if (raw) setMsgs(JSON.parse(raw)); } catch { /* private mode */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("ks_chat", JSON.stringify(msgs.slice(-30))); } catch { /* private mode */ }
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs]);
  useEffect(() => () => { stopRef.current(); stopSpeaking(); }, []);

  const say = async (m: Msg) => {
    setNote("");
    setSpeaking(true);
    const r = await speak(m.text, m.lang, () => setSpeaking(true));
    setSpeaking(false);
    if (r === "no-voice") setNote(t("assistant.noVoice").replace("{l}", m.lang === "ar" ? "العربية" : "English"));
    if (r === "unsupported") setNote(t("assistant.noSpeech"));
  };

  const send = async (raw: string, viaVoice = false) => {
    const q = raw.trim();
    if (!q || busy) return;
    setBusy(true); setText(""); setNote("");
    const ql = detectLang(q, fallback);
    const you: Msg = { id: Date.now(), role: "you", text: q, lang: ql, voice: viaVoice };
    const consents = (cons.data ?? []).filter((c) => !c.revoked_at).map((c) => t(`scope.${c.scope}`));
    let r = answer(q, { uiLang: fallback, ownBlocks: expl.data?.blocks ?? [], consents });
    if (!MOCK && !r.refused) { // the server runs the same guard and records the decision; if it refuses, it wins
      try { const s = await api.copilot(q); if (s.refused) r = answer("partner raw result", { uiLang: r.lang, ownBlocks: [], consents: [] }); } catch { /* offline: local answer stands */ }
    }
    const kin: Msg = { id: you.id + 1, role: "kin", text: r.text, lang: r.lang, links: r.links, refused: r.refused };
    setMsgs((m) => [...m, you, kin]);
    setBusy(false);
    if (readAloud || viaVoice) void say(kin);
  };

  const toggleMic = () => {
    if (listening) { stopRef.current(); return; }
    stopSpeaking(); setSpeaking(false); setNote("");
    setListening(true);
    stopRef.current = listen(micLang, (r) => {
      setListening(false);
      if (r.error === "not-allowed" || r.error === "service-not-allowed") return setNote(t("assistant.micBlocked"));
      if (r.error === "unsupported") return setNote(t("assistant.noMic"));
      if (r.error === "no-speech" || (!r.transcript && !r.error)) return setNote(t("assistant.noSpeechHeard"));
      if (r.error && r.error !== "aborted") return setNote(t("assistant.micError"));
      void send(r.transcript, true);
    }, (interim) => setText(interim));
  };

  const hasSpeech = canListen();
  const chips = suggestions(fallback);
  return (
    <section aria-label={t("assistant.title")} className={`flex min-h-0 flex-col bg-surface ${layout === "page" ? "card-flush h-[min(70vh,40rem)]" : "h-full"}`}>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <KinLogo size={36} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-tight">{t("assistant.name")}</h2>
          <p className="truncate text-xs text-muted">{t("assistant.tag")}</p>
        </div>
        <div role="group" aria-label={t("assistant.language")} className="seg">
          {([["auto", t("assistant.auto")], ["en", "EN"], ["ar", "AR"]] as [Mode, string][]).map(([m, label]) => (
            <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{label}</button>
          ))}
        </div>
        <button className="btn-quiet h-8 w-8 px-0" aria-pressed={readAloud} aria-label={t("assistant.readAloud")} title={t("assistant.readAloud")} onClick={() => { setReadAloud(!readAloud); if (readAloud) { stopSpeaking(); setSpeaking(false); } }}>
          {readAloud ? <Volume2 aria-hidden className="h-4 w-4" /> : <VolumeX aria-hidden className="h-4 w-4" />}
        </button>
        {layout === "float" && <button className="btn-quiet h-8 w-8 px-0" aria-label={t("assistant.close")} onClick={onClose}><X aria-hidden className="h-4 w-4" /></button>}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" data-testid="kin-log">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="max-w-read text-sm text-muted">{t("assistant.intro")}</p>
            <ul className="flex flex-wrap gap-2">{chips.map((c) => <li key={c}><button className="btn-quiet btn-sm" onClick={() => send(c)}>{c}</button></li>)}</ul>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex flex-col gap-1.5 ${m.role === "you" ? "items-end" : "items-start"}`}>
            <p dir={m.lang === "ar" ? "rtl" : "ltr"} data-lang={m.lang} data-role={m.role}
              className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${m.role === "you" ? "rounded-ee-md bg-brand-600 text-onbrand" : m.refused ? "rounded-es-md bg-note-bg text-note-fg" : "rounded-es-md bg-sunk"}`}>
              {m.voice && <Mic aria-hidden className="me-1.5 inline h-3 w-3 opacity-70" />}{m.text}
            </p>
            {m.links?.map((l) => (
              <button key={l.href} className="btn-quiet btn-sm" onClick={() => { router.push(l.href); onClose?.(); }}>{l.label}</button>
            ))}
          </div>
        ))}
        {busy && <p className="text-xs text-muted">{t("assistant.thinking")}</p>}
        <div ref={end} />
      </div>

      {note && <p role="status" className="mx-4 mb-2 rounded-lg bg-note-bg px-3 py-2 text-xs text-note-fg" data-testid="kin-note">{note}</p>}
      {msgs.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto px-4 pb-2" aria-label={t("assistant.try")}>
          {chips.slice(0, 3).map((c) => <li key={c} className="shrink-0"><button className="btn-quiet btn-sm font-normal" onClick={() => send(c)}>{c}</button></li>)}
        </ul>
      )}
      <form className="flex items-center gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <button type="button" onClick={toggleMic} disabled={!hasSpeech && !listening} aria-pressed={listening}
          aria-label={listening ? t("assistant.stopListening") : t("assistant.speak")} title={hasSpeech ? t("assistant.speak") : t("assistant.noMic")}
          className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${listening ? "border-brand-600 bg-brand-600 text-onbrand" : "border-line bg-surface text-ink hover:bg-brand-50"} disabled:opacity-50`}>
          {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand-600/40" />}
          {hasSpeech ? <Mic aria-hidden className="relative h-4 w-4" /> : <MicOff aria-hidden className="relative h-4 w-4" />}
        </button>
        <input ref={input} className="field flex-1" dir="auto" value={text} maxLength={2000} lang={BCP47[micLang]}
          onChange={(e) => setText(e.target.value)} placeholder={listening ? t("assistant.listening") : t("assistant.placeholder")} aria-label={t("assistant.placeholder")} />
        {speaking
          ? <button type="button" className="btn-quiet h-10 w-10 px-0" aria-label={t("assistant.stopSpeaking")} onClick={() => { stopSpeaking(); setSpeaking(false); }}><Square aria-hidden className="h-4 w-4" /></button>
          : <button className="btn h-10 w-10 px-0" disabled={!text.trim() || busy} aria-label={t("ask.send")}><SendHorizontal aria-hidden className="h-4 w-4 rtl:rotate-180" /></button>}
      </form>
      <p className="px-4 pb-3 text-[11px] text-muted">{t("assistant.privacy")}{canSpeak() ? "" : ` ${t("assistant.noSpeech")}`}</p>
    </section>
  );
}

export function AssistantLauncher() {
  const { t } = useI18n();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); toggle(); } if (e.key === "Escape") setOpen(false); };
    window.addEventListener("kin:toggle", toggle); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("kin:toggle", toggle); window.removeEventListener("keydown", key); };
  }, []);
  if (path === "/ask") return null;
  return (
    <div data-noprint className="fixed bottom-4 end-4 z-40 flex flex-col items-end gap-3">
      {open && (
        <div role="dialog" aria-label={t("assistant.title")} className="h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line shadow-lift">
          <AssistantPanel mode="float" onClose={() => setOpen(false)} />
        </div>
      )}
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t("assistant.open")} title={`${t("assistant.open")} (Ctrl /)`}
        className="group relative grid h-16 w-16 place-items-center rounded-full border border-line bg-surface shadow-lift transition-transform hover:-translate-y-0.5">
        <KinLogo size={52} />
        {!open && <span aria-hidden className="pointer-events-none absolute inset-0 animate-ping rounded-full border-2 border-brand-500/40 [animation-iteration-count:3]" />}
      </button>
    </div>
  );
}
