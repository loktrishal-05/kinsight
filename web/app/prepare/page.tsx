"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Notice, PageHeader, Steps } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { BRING, CONCERNS, EMPTY, SECTIONS, STAGES, type Concern, type Section, type Sheet } from "@/lib/prep";

const VALUES = ["q1", "q2", "q3"];
const STEPS = ["values", "worries", "questions", "bring", "share"] as const;
const move = <T,>(list: T[], i: number, by: number) => { const next = [...list], j = i + by; if (j < 0 || j >= next.length) return next; [next[i], next[j]] = [next[j], next[i]]; return next; };
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

// A private preparation sheet. Every step is optional and autosaved; nothing is shared with the counsellor unless a section is switched on.
export default function Prepare() {
  const { t, lang } = useI18n();
  const [sheet, setSheet] = useState<Sheet>(EMPTY);
  const [step, setStep] = useState(0);
  const [own, setOwn] = useState("");
  const loaded = useRef(false);
  const saved = useQuery({ queryKey: ["prep"], queryFn: api.prep });
  const couple = useQuery({ queryKey: ["couple"], queryFn: () => api.couple() });
  // The result tier only informs the suggestions once it has been released to this person.
  const tier = couple.data && !couple.data.awaiting_counsellor ? couple.data.tier ?? undefined : undefined;
  const sug = useQuery({ queryKey: ["prep-sug", lang, sheet.stage, sheet.concerns, tier], queryFn: () => api.prepSuggestions(sheet.stage, lang, sheet.concerns, tier) });
  const save = useMutation({ mutationFn: api.savePrep });

  useEffect(() => { if (saved.isSuccess && !loaded.current) { loaded.current = true; if (saved.data) setSheet(saved.data); } }, [saved.isSuccess, saved.data]);
  useEffect(() => { // autosave shortly after the last change, never before the stored sheet has been read
    if (!loaded.current) return;
    const id = setTimeout(() => save.mutate(sheet), 600);
    return () => clearTimeout(id);
  }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  const edit = (patch: Partial<Sheet>) => setSheet((s) => ({ ...s, ...patch }));
  const label = (c: string) => sug.data?.concerns[c] ?? c;
  const addQuestion = (id: string, text: string) => text.trim() && !sheet.questions.some((q) => q.id === id) && edit({ questions: [...sheet.questions, { id, text: text.trim().slice(0, 300) }] });
  const labels = STEPS.map((s) => t(`prep.step.${s}`));

  return (
    <section className="space-y-6">
      <div data-noprint className="space-y-6">
        <PageHeader title={t("prep.title")} lead={t("prep.lead")} />
        <Notice>{t("prep.private")}</Notice>
        <Steps labels={labels} current={step} />
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("prep.title")}>
          {labels.map((l, i) => <button key={l} className="btn-quiet btn-sm" aria-current={i === step ? "step" : undefined} onClick={() => setStep(i)}>{l}</button>)}
        </div>

        {step === 0 && <div className="card space-y-4">
          <label className="block text-sm font-medium">{t("prep.stage")}
            <select className="field mt-1 max-w-sm" value={sheet.stage} onChange={(e) => edit({ stage: e.target.value as Sheet["stage"] })}>
              {STAGES.map((s) => <option key={s} value={s}>{t(`prep.stage.${s}`)}</option>)}
            </select>
          </label>
          <p className="text-sm text-muted">{t("prep.values.help")}</p>
          {VALUES.map((v) => <label key={v} className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={sheet.values.includes(v)} onChange={() => edit({ values: toggle(sheet.values, v) })} />{t(`values.${v}`)}</label>)}
        </div>}

        {step === 1 && <div className="card space-y-4">
          <p className="text-sm text-muted">{t("prep.concerns.help")}</p>
          {CONCERNS.map((c) => <label key={c} className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4" checked={sheet.concerns.includes(c)} onChange={() => edit({ concerns: toggle<Concern>(sheet.concerns, c) })} />{label(c)}</label>)}
          <label className="block text-sm font-medium">{t("prep.worries")}
            <textarea className="field mt-1 h-28 py-2" maxLength={1000} value={sheet.worries_text} onChange={(e) => edit({ worries_text: e.target.value })} />
          </label>
        </div>}

        {step === 2 && <div className="grid gap-4 md:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold">{t("prep.suggested")}</h2>
            {sug.data?.placeholder && <Notice>{t("prep.placeholder")}</Notice>}
            <ul className="space-y-2">{sug.data?.questions.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 text-sm"><span>{q.text}</span>
                <button className="btn-quiet btn-sm shrink-0" disabled={sheet.questions.some((x) => x.id === q.id)} onClick={() => addQuestion(q.id, q.text)}><Plus aria-hidden className="h-3.5 w-3.5" />{t("prep.add")}</button></li>
            ))}</ul>
          </div>
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold">{t("prep.mine")}</h2>
            {sheet.questions.length === 0 && <p className="text-sm text-muted">{t("prep.empty")}</p>}
            <ol className="space-y-2">{sheet.questions.map((q, i) => (
              <li key={q.id} className="flex items-start gap-2 text-sm"><span className="flex-1">{q.text}</span>
                <button aria-label={t("prep.up")} className="btn-quiet btn-sm" onClick={() => edit({ questions: move(sheet.questions, i, -1) })}><ArrowUp aria-hidden className="h-3.5 w-3.5" /></button>
                <button aria-label={t("prep.down")} className="btn-quiet btn-sm" onClick={() => edit({ questions: move(sheet.questions, i, 1) })}><ArrowDown aria-hidden className="h-3.5 w-3.5" /></button>
                <button aria-label={t("prep.remove")} className="btn-quiet btn-sm" onClick={() => edit({ questions: sheet.questions.filter((x) => x.id !== q.id) })}><Trash2 aria-hidden className="h-3.5 w-3.5" /></button></li>
            ))}</ol>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addQuestion(`own_${Date.now().toString(36)}`, own); setOwn(""); }}>
              <input className="field" maxLength={300} aria-label={t("prep.addOwn")} placeholder={t("prep.addOwn")} value={own} onChange={(e) => setOwn(e.target.value)} />
              <button className="btn-quiet shrink-0">{t("prep.add")}</button>
            </form>
          </div>
        </div>}

        {step === 3 && <div className="card space-y-3">
          <p className="text-sm text-muted">{t("prep.bring.help")}</p>
          {BRING.map((b) => <label key={b} className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4" checked={sheet.bring.includes(b)} onChange={() => edit({ bring: toggle(sheet.bring, b) })} />{sug.data?.bring[b] ?? b}</label>)}
        </div>}

        {step === 4 && <div className="card space-y-3" data-demo="prep-share">
          <p className="text-sm">{t("prep.share.help")}</p>
          {SECTIONS.map((s) => <label key={s} className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4" checked={sheet.share.includes(s)} onChange={() => edit({ share: toggle<Section>(sheet.share, s) })} />
            {t(`prep.share.${s}`)}</label>)}
          <p role="status" className="text-sm text-muted">{sheet.share.length ? t("prep.share.on") : t("prep.share.off")}</p>
        </div>}

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-quiet" disabled={step === 0} onClick={() => setStep(step - 1)}>{t("prep.back")}</button>
          <button className="btn-quiet" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>{t("prep.skipNext")}</button>
          <span role="status" className="text-sm text-muted">{save.isPending ? t("prep.saving") : save.isSuccess ? t("prep.saved") : ""}</span>
          <button className="btn ms-auto" onClick={() => window.print()}><Printer aria-hidden className="h-4 w-4" />{t("prep.print")}</button>
        </div>
      </div>

      <article className="card space-y-3" aria-labelledby="sheet-title">
        <h2 id="sheet-title" className="text-lg font-semibold">{t("prep.sheet")}</h2>
        <p className="text-sm text-muted">{t("prep.sheetNote")}</p>
        {sheet.concerns.length > 0 && <div><h3 className="font-semibold">{t("prep.step.worries")}</h3><ul className="list-disc ps-5">{sheet.concerns.map((c) => <li key={c}>{label(c)}</li>)}</ul>{sheet.worries_text && <p className="mt-1 whitespace-pre-line">{sheet.worries_text}</p>}</div>}
        {sheet.values.length > 0 && <div><h3 className="font-semibold">{t("prep.step.values")}</h3><ul className="list-disc ps-5">{sheet.values.map((v) => <li key={v}>{t(`values.${v}`)}</li>)}</ul></div>}
        <div><h3 className="font-semibold">{t("prep.step.questions")}</h3>{sheet.questions.length ? <ol className="list-decimal ps-5">{sheet.questions.map((q) => <li key={q.id}>{q.text}</li>)}</ol> : <p className="text-sm text-muted">{t("prep.empty")}</p>}</div>
        {sheet.bring.length > 0 && <div><h3 className="font-semibold">{t("prep.step.bring")}</h3><ul className="list-disc ps-5">{sheet.bring.map((b) => <li key={b}>{sug.data?.bring[b] ?? b}</li>)}</ul></div>}
      </article>
    </section>
  );
}
