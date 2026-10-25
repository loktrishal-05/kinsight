"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { Speak } from "@/components/Voice";
import { useI18n } from "@/lib/i18n";

export default function Ask() {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ q: string; a: string }[]>([]);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("ask.title")}</h1>
      <ul className="space-y-2" aria-live="polite">
        {log.map((m, i) => <li key={i} className="card"><p className="text-sm text-slate-600">{m.q}</p><p>{m.a}</p></li>)}
      </ul>
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault();
        const r = await api.copilot(text);
        setLog([...log, { q: text, a: r.refused ? t("ask.refusal") : r.text }]);
        setText("");
      }}>
        <input className="flex-1 rounded-md border border-slate-300 px-3 py-2" value={text} maxLength={2000} placeholder={t("ask.placeholder")} aria-label={t("ask.title")} onChange={(e) => setText(e.target.value)} />
        <Speak onText={setText} />
        <button className="btn" disabled={!text.trim()}>{t("ask.send")}</button>
      </form>
    </section>
  );
}
