"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Understand() {
  const { t, lang } = useI18n();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [round, setRound] = useState(0);
  const quiz = useQuery({ queryKey: ["quiz", lang, round], queryFn: () => api.quiz(lang) });
  const submit = useMutation({
    mutationFn: () => api.submitQuiz(answers),
    onSuccess: (r) => {
      if (r.passed) setMsg(t("quiz.done"));
      else if (r.counsellor_offered) setMsg(t("quiz.counsellorOffer"));
      else { setMsg(t("quiz.again")); setAnswers({}); setRound((x) => x + 1); } // gentle re-explanation, never a failure score
    },
  });
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("quiz.title")}</h1>
      <p className="note">{t("quiz.intro")}</p>
      {msg && <p className="card" role="status" data-testid="quiz-msg">{msg}</p>}
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
        {quiz.data?.questions.map((q, qi) => {
          const opts = [...q.options.slice(qi % q.options.length), ...q.options.slice(0, qi % q.options.length)]; // mock only: vary position
          return (
            <fieldset key={q.id} className="card">
              <legend className="font-medium">{q.text}</legend>
              {opts.map((o) => (
                <label key={o.id} className="mt-1 flex items-center gap-2">
                  <input type="radio" name={q.id} checked={answers[q.id] === o.id} onChange={() => setAnswers({ ...answers, [q.id]: o.id })} />
                  {o.text}
                </label>
              ))}
            </fieldset>
          );
        })}
        <button className="btn" disabled={Object.keys(answers).length < (quiz.data?.questions.length ?? 1)}>{t("quiz.submit")}</button>
      </form>
    </section>
  );
}
