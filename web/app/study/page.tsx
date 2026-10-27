"use client";
// Volunteer comprehension study, participant view (docs/study/protocol.md): consent in the participant's language, one fictional
// case explanation, the five-question check (first attempt only, no re-explanation), an optional clarity rating. A facilitator runs
// it on their own device; ?level=basic|standard fixes the reading level and ?case=s1..s7 the case.
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand, LangSwitch } from "@/components/PublicChrome";
import { useI18n } from "@/lib/i18n";
import { assignLevel, grade, newStudyId, saveResponse, studyCase, type Level } from "@/lib/study";

type Step = "consent" | "read" | "quiz" | "rate" | "done";

export default function Study() {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>("consent");
  const [agree, setAgree] = useState(false);
  const [id, setId] = useState("");
  const [level, setLevel] = useState<Level>("basic");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [started, setStarted] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState(false);
  useEffect(() => { setCaseId(new URLSearchParams(location.search).get("case")); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const c = studyCase(caseId, lang, level);
  const begin = () => {
    setId(newStudyId()); setLevel(assignLevel(lang, new URLSearchParams(location.search).get("level")));
    setStarted(new Date().toISOString()); setAnswers({}); setStep("read");
  };
  const submitQuiz = () => {
    if (c.quiz.some((q) => !answers[q.id])) { setMissing(true); return; }
    setMissing(false); setStep("rate");
  };
  const finish = (clarity: number | null) => {
    saveResponse({ study_id: id, language: lang, reading_level: level, case_id: c.id, answers, ...grade(c.quiz, answers), clarity,
      started_at: started, finished_at: new Date().toISOString() });
    setStep("done");
  };
  const reset = () => { setAgree(false); setStep("consent"); };
  const card = "w-full max-w-2xl rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-9";
  const primary = "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-bold text-onbrand shadow-lift transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="theme-light min-h-[100svh] bg-canvas text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Brand />
        {step === "consent" && <LangSwitch />}
      </header>
      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 sm:px-6">
        {step === "consent" && (
          <section aria-labelledby="st" className={card}>
            <h1 id="st" className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight tracking-[-0.03em]">{t("study.title")}</h1>
            <p className="mt-3 text-ink/75">{t("study.lead")}</p>
            <ul className="mt-6 space-y-3">
              {["c1", "c2", "c3", "c4", "c5"].map((k) => (
                <li key={k} className="flex gap-3 text-sm"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{t(`study.${k}`)}</li>
              ))}
            </ul>
            <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm font-semibold">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-brand-600" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-testid="study-agree" />
              {t("study.agree")}
            </label>
            <div className="mt-6"><button className={primary} disabled={!agree} onClick={begin} data-testid="study-start">{t("study.start")}<ArrowRight aria-hidden className="h-4 w-4 rtl:rotate-180" /></button></div>
          </section>
        )}

        {step === "read" && (
          <section aria-labelledby="sr" className={card}>
            <p className="text-xs font-semibold text-muted">{t("study.step").replace("{n}", "1")}</p>
            <h1 id="sr" className="mt-1 font-display text-2xl font-bold tracking-[-0.02em]">{t("study.readTitle")}</h1>
            <p className="mt-2 text-sm text-ink/70">{t("study.readLead")}</p>
            <div className="mt-6 space-y-3 rounded-2xl bg-sunk p-5 leading-relaxed" data-testid="study-text">
              {c.blocks.map((b, i) => <p key={i}>{b}</p>)}
            </div>
            <div className="mt-6"><button className={primary} onClick={() => setStep("quiz")} data-testid="study-read">{t("study.readDone")}<ArrowRight aria-hidden className="h-4 w-4 rtl:rotate-180" /></button></div>
          </section>
        )}

        {step === "quiz" && (
          <section aria-labelledby="sq" className={card}>
            <p className="text-xs font-semibold text-muted">{t("study.step").replace("{n}", "2")}</p>
            <h1 id="sq" className="mt-1 font-display text-2xl font-bold tracking-[-0.02em]">{t("study.quizTitle")}</h1>
            <p className="mt-2 text-sm text-ink/70">{t("study.quizLead")}</p>
            <ol className="mt-6 space-y-6">
              {c.quiz.map((q, i) => (
                <li key={q.id}>
                  <fieldset>
                    <legend className="font-semibold">{i + 1}. {q.text}</legend>
                    <div className="mt-2 space-y-2">
                      {q.options.map((o) => (
                        <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${answers[q.id] === o.id ? "border-brand-500 bg-brand-50" : "border-line hover:bg-canvas"}`}>
                          <input type="radio" name={q.id} className="h-4 w-4 accent-brand-600" checked={answers[q.id] === o.id} onChange={() => setAnswers({ ...answers, [q.id]: o.id })} />
                          {o.text}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
            {missing && <p role="alert" className="mt-4 text-sm font-medium text-unsure-fg">{t("study.answerAll")}</p>}
            <div className="mt-6"><button className={primary} onClick={submitQuiz} data-testid="study-submit">{t("study.submit")}<ArrowRight aria-hidden className="h-4 w-4 rtl:rotate-180" /></button></div>
          </section>
        )}

        {step === "rate" && (
          <section aria-labelledby="sc" className={card}>
            <p className="text-xs font-semibold text-muted">{t("study.step").replace("{n}", "3")}</p>
            <h1 id="sc" className="mt-1 font-display text-2xl font-bold tracking-[-0.02em]">{t("study.rateTitle")}</h1>
            <p className="mt-2 text-sm text-ink/70">{t("study.rateLead")}</p>
            <div role="group" aria-label={t("study.rateTitle")} className="mt-6 flex flex-wrap gap-2" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => finish(n)} data-testid={`study-rate-${n}`} className="grid h-14 w-14 place-items-center rounded-2xl border border-line text-lg font-bold transition hover:border-brand-500 hover:bg-brand-50">{n}</button>
              ))}
            </div>
            <p className="mt-2 flex justify-between text-xs text-muted" dir="ltr"><span>{t("study.rateLow")}</span><span>{t("study.rateHigh")}</span></p>
            <button className="mt-6 text-sm font-semibold text-brand-700 underline underline-offset-4" onClick={() => finish(null)} data-testid="study-skip">{t("study.skip")}</button>
          </section>
        )}

        {step === "done" && (
          <section aria-labelledby="sd" className={`${card} text-center`}>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-onbrand"><Check aria-hidden className="h-7 w-7" /></span>
            <h1 id="sd" className="mt-4 font-display text-2xl font-bold tracking-[-0.02em]">{t("study.thanks")}</h1>
            <p className="mt-2 text-ink/75">{t("study.thanksLead")}</p>
            <p className="mt-4 text-sm text-muted">{t("study.yourId")} <span className="font-mono font-semibold text-ink" data-testid="study-id">{id}</span></p>
            <button className={`${primary} mt-8`} onClick={reset} data-testid="study-next">{t("study.next")}</button>
          </section>
        )}
        <p className="mt-6 max-w-2xl text-center text-xs text-muted">{t("banner")}</p>
      </main>
    </div>
  );
}
