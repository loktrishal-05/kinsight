"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

// Optional voice (P5-6) using browser speech APIs where present; otherwise a plain-text notice. Flag: NEXT_PUBLIC_VOICE != "0".
const on = process.env.NEXT_PUBLIC_VOICE !== "0";

export function ReadAloud({ text }: { text: string }) {
  const { t, lang } = useI18n();
  const [msg, setMsg] = useState("");
  if (!on) return null;
  return (
    <span>
      <button className="btn-quiet" onClick={() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return setMsg(t("voice.unsupported"));
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === "ar" ? "ar-AE" : lang;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }}>{t("voice.read")}</button>
      {msg && <span role="status" className="ms-2 text-sm">{msg}</span>}
    </span>
  );
}

export function Speak({ onText }: { onText: (s: string) => void }) {
  const { t, lang } = useI18n();
  const [msg, setMsg] = useState("");
  if (!on) return null;
  return (
    <span>
      <button type="button" className="btn-quiet" onClick={() => {
        const W = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any };
        const R = W.SpeechRecognition ?? W.webkitSpeechRecognition;
        if (!R) return setMsg(t("voice.unsupported")); // falls back cleanly to typing
        const r = new R();
        r.lang = lang === "ar" ? "ar-AE" : lang;
        r.onresult = (e: any) => onText(e.results[0][0].transcript);
        r.onerror = () => setMsg(t("voice.unsupported"));
        r.start();
      }}>{t("voice.speak")}</button>
      {msg && <span role="status" className="ms-2 text-sm">{msg}</span>}
    </span>
  );
}
