"use client";
import Restricted from "@/components/Restricted";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Notice, PageHeader } from "@/components/ui";
import { api, MOCK } from "@/lib/api";
import type { Booking } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function Plan() {
  const { t } = useI18n();
  const { persona } = useSession();
  if (persona !== "person_a" && persona !== "person_b" && persona !== "demo_operator") return <Restricted text={t("plan.restricted")} />;
  return <PlanCards key={persona} persona={persona} />;
}

function PlanCards({ persona }: { persona: string }) {
  const { t, lang } = useI18n();
  const [sla, setSla] = useState(120);
  const [booking, setBooking] = useState<Booking | null>(api.demoBooking);
  const [lmp, setLmp] = useState("");
  const [months, setMonths] = useState("");
  const [correct, setCorrect] = useState("");
  const [total, setTotal] = useState("");
  const [attitude, setAttitude] = useState<"favourable" | "unfavourable">("favourable");
  const [acted, setActed] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const slots = useQuery({ queryKey: ["plan", persona, "slots", sla], queryFn: () => api.bookingSlots(sla) });
  const book = useMutation({ mutationFn: (slot_at: number) => api.book({ slot_at }), onSuccess: setBooking });
  const cancel = useMutation({ mutationFn: () => api.cancelBooking(booking!.id), onSuccess: (data) => setBooking((current) => current && { ...current, status: data.status }) });
  const gestation = useMutation({ mutationFn: () => api.gestation({ days_since_lmp: Number(lmp) }) });
  const reengagement = useMutation({ mutationFn: () => api.reengagement(Number(months)) });
  const mmic = useMutation({ mutationFn: () => api.mmic({ knowledge_correct: Number(correct), knowledge_total: Number(total), attitude, acted }) });
  const gcos = useMutation({ mutationFn: () => api.gcos({ answers: Array.from({ length: 24 }, (_, i) => Number(answers[i])) }) });
  const date = (seconds: number) => new Date(seconds * 1000).toLocaleString(lang);
  return <section className="space-y-6">
    <PageHeader title={t("plan.title")} />
    {MOCK && <Notice>{t("plan.demo")}</Notice>}
    {[slots, book, cancel, gestation, reengagement, mmic, gcos].some((m) => m.isError) && <p role="alert" className="note">{t("plan.error")}</p>}
    <section className="card space-y-4" aria-labelledby="booking-title">
      <h2 id="booking-title" className="text-lg font-semibold">{t("plan.booking")}</h2>
      <label className="block" htmlFor="urgency">{t("plan.urgency")}<select id="urgency" className="field mt-1" value={sla} onChange={(e) => setSla(Number(e.target.value))}>
        {[[120, "usual"], [48, "soon"], [12, "urgent"]].map(([hours, key]) => <option key={key} value={hours}>{t(`plan.${key}`)}</option>)}
      </select></label>
      {slots.isPending && <p role="status">{t("plan.loading")}</p>}
      {slots.data?.slots.length === 0 && <p>{t("plan.noSlots")}</p>}
      <ul className="space-y-3">{slots.data?.slots.map((slot) => <li key={slot} className="flex flex-wrap items-center gap-3">
        <time dateTime={new Date(slot * 1000).toISOString()}>{date(slot)}</time>
        <button className="btn-quiet" disabled={book.isPending || cancel.isPending || booking?.status === "booked"} onClick={() => book.mutate(slot)}>{t("plan.book")}</button>
      </li>)}</ul>
      {booking && <div role="status" className="space-y-3"><p>{t("plan.currentBooking")}: {date(booking.slot_at)} &middot; {t(`plan.status.${booking.status}`)}</p>
        {booking.status === "booked" && <button className="btn-quiet" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{t("plan.cancel")}</button>}
      </div>}
    </section>
    <section className="card space-y-4" aria-labelledby="gestation-title">
      <h2 id="gestation-title" className="text-lg font-semibold">{t("plan.gestation")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); gestation.mutate(); }}>
        <label className="block" htmlFor="lmp">{t("plan.lmp")}<input id="lmp" className="field mt-1" type="number" min="0" max="300" required value={lmp} onChange={(e) => { setLmp(e.target.value); gestation.reset(); }} /></label>
        <button className="btn-quiet" disabled={gestation.isPending}>{t("plan.calculate")}</button>
      </form>
      {gestation.data && <div role="status"><p>{gestation.data.weeks} {t("plan.weeks")} {gestation.data.days % 7} {t("plan.days")}</p>
        <p>{t("plan.to120")}: {gestation.data.days_to_day_120}</p>
        <p>{t(gestation.data.in_cvs_window ? "plan.inWindow" : "plan.outsideWindow")}</p>
        {gestation.data.past_day_120 && <p>{t("plan.past120")}</p>}
      </div>}
    </section>
    <section className="card space-y-4" aria-labelledby="reengagement-title">
      <h2 id="reengagement-title" className="text-lg font-semibold">{t("plan.reengagement")}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); reengagement.mutate(); }}>
        <label className="block" htmlFor="months">{t("plan.months")}<input id="months" className="field mt-1" type="number" min="0" required value={months} onChange={(e) => { setMonths(e.target.value); reengagement.reset(); }} /></label>
        <button className="btn-quiet" disabled={reengagement.isPending}>{t("plan.check")}</button>
      </form>
      {reengagement.data && <p role="status">{reengagement.data.due_month === null ? t("plan.noneDue") : t("plan.due").replace("{n}", String(reengagement.data.due_month))}</p>}
    </section>
    <section className="card space-y-4" aria-labelledby="measures-title">
      <h2 id="measures-title" className="text-lg font-semibold">{t("plan.measures")}</h2>
      <form className="space-y-3" aria-label={t("plan.mmic")} onSubmit={(e) => { e.preventDefault(); mmic.mutate(); }}>
        <h3 className="font-semibold">{t("plan.mmic")}</h3>
        <label className="block" htmlFor="knowledge-correct">{t("plan.correct")}<input id="knowledge-correct" className="field mt-1" type="number" min="0" max={total || undefined} required value={correct} onChange={(e) => { setCorrect(e.target.value); mmic.reset(); }} /></label>
        <label className="block" htmlFor="knowledge-total">{t("plan.knowledgeTotal")}<input id="knowledge-total" className="field mt-1" type="number" min="1" required value={total} onChange={(e) => { setTotal(e.target.value); mmic.reset(); }} /></label>
        <label className="block" htmlFor="attitude">{t("plan.attitude")}<select id="attitude" className="field mt-1" value={attitude} onChange={(e) => { setAttitude(e.target.value as typeof attitude); mmic.reset(); }}>{["favourable", "unfavourable"].map((v) => <option key={v} value={v}>{t(`plan.${v}`)}</option>)}</select></label>
        <label className="block" htmlFor="acted">{t("plan.acted")}<select id="acted" className="field mt-1" value={String(acted)} onChange={(e) => { setActed(e.target.value === "true"); mmic.reset(); }}><option value="true">{t("plan.yes")}</option><option value="false">{t("plan.no")}</option></select></label>
        <button className="btn-quiet" disabled={mmic.isPending}>{t("plan.submitMmic")}</button>
      </form>
      {mmic.data && <p role="status">{t(mmic.data.informed ? "plan.informed" : "plan.notYet")}</p>}
      <form className="space-y-3" aria-label={t("plan.gcos")} onSubmit={(e) => { e.preventDefault(); gcos.mutate(); }}>
        <h3 className="font-semibold">{t("plan.gcos")}</h3>
        <p className="text-sm text-muted">{t("plan.licensed")}</p>
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 24 }, (_, i) => <label key={i} htmlFor={`empowerment-${i}`}>{t("plan.item")} {i + 1}<select id={`empowerment-${i}`} className="field mt-1" required value={answers[i] ?? ""} onChange={(e) => { setAnswers({ ...answers, [i]: e.target.value }); gcos.reset(); }}>
          <option value="" disabled>{t("plan.choose")}</option>{[1, 2, 3, 4, 5, 6, 7].map((v) => <option key={v} value={v}>{v}</option>)}
        </select></label>)}</div>
        <button className="btn-quiet" disabled={gcos.isPending}>{t("plan.submitGcos")}</button>
      </form>
      {gcos.data && <p role="status">{t("plan.totalScore")}: {gcos.data.total}</p>}
    </section>
  </section>;
}
