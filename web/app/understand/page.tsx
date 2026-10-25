"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Heart } from "lucide-react";
import { useState } from "react";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Understand() {
  const { t, lang } = useI18n();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [round, setRound] = useState(0);
  const quiz = useQuery({ queryKey: ["quiz", lang, round], queryFn: () => api.quiz(lang) });
  const total = quiz.data?.questions.length ?? 5;
  const submit = useMutation({
    mutationFn: () => api.submitQuiz(answers),
    onSuccess: (r) => {
      if (r.passed) setMsg({ text: t("quiz.done"), ok: true });
      else if (r.counsellor_offered) setMsg({ text: t("quiz.counsellorOffer"), ok: false });
      else { setMsg({ text: t("quiz.again"), ok: false }); setAnswers({}); setRound((x) => x + 1); } // gentle re-explanation, never a failure score
    },
  });
  const done = Object.keys(answers).length;
  return (
    <section className="space-y-6">
      <PageHeader title={t("quiz.title")} lead={t("quiz.intro")} />
      {msg && (
        <p className="note" role="status" data-testid="quiz-msg">
          {msg.ok ? <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> : <Heart aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{msg.text}</span>
        </p>
      )}
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
        {quiz.data?.questions.map((q, qi) => {
          const opts = [...q.options.slice(qi % q.options.length), ...q.options.slice(0, qi % q.options.length)]; // mock only: vary position
          return (
            <div key={q.id} role="group" aria-labelledby={`q-${q.id}`} className="card">
              <p id={`q-${q.id}`} className="mb-3 flex items-baseline gap-3 font-semibold">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{qi + 1}</span>
                {q.text}
              </p>
              <div className="space-y-2">
                {opts.map((o) => (
                  <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors hover:bg-brand-50 ${answers[q.id] === o.id ? "border-brand-600 bg-brand-50" : "border-line"}`}>
                    <input type="radio" className="h-4 w-4 accent-[#106b68]" name={q.id} checked={answers[q.id] === o.id}
                      onChange={() => setAnswers({ ...answers, [q.id]: o.id })} />
                    {o.text}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn" disabled={done < total}>{t("quiz.submit")}</button>
          <span className="text-sm text-muted tabular-nums" aria-live="polite">{done} / {total} {t("quiz.progress")}</span>
        </div>
      </form>
      {!quiz.data && <Notice>{t("loading")}</Notice>}
    </section>
  );
}
