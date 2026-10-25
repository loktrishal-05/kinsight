"use client";
import { SendHorizontal } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { Speak } from "@/components/Voice";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Ask() {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ q: string; a: string; refused: boolean }[]>([]);
  return (
    <section className="space-y-6">
      <PageHeader title={t("ask.title")} lead={t("ask.lead")} />
      <div className="card min-h-40 space-y-4" aria-live="polite">
        {log.length === 0 && <p className="text-muted">{t("ask.empty")}</p>}
        {log.map((m, i) => (
          <div key={i} className="space-y-2">
            <p className="ms-auto w-fit max-w-[85%] rounded-2xl rounded-ee-md bg-brand-600 px-4 py-2 text-white">{m.q}</p>
            <p className={`w-fit max-w-[85%] rounded-2xl rounded-es-md px-4 py-2 ${m.refused ? "bg-note-bg text-note-fg" : "bg-canvas"}`}>{m.a}</p>
          </div>
        ))}
      </div>
      <form className="flex items-center gap-2" onSubmit={async (e) => {
        e.preventDefault();
        const q = text; setText("");
        const r = await api.copilot(q);
        setLog((l) => [...l, { q, a: r.refused ? t("ask.refusal") : r.text, refused: !!r.refused }]);
      }}>
        <input className="field flex-1" value={text} maxLength={2000} placeholder={t("ask.placeholder")} aria-label={t("ask.title")} onChange={(e) => setText(e.target.value)} />
        <Speak onText={setText} />
        <button className="btn" disabled={!text.trim()}><SendHorizontal aria-hidden className="h-4 w-4 rtl:rotate-180" />{t("ask.send")}</button>
      </form>
    </section>
  );
}
