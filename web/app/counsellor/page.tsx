"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pause, Pencil, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import FhirFindings from "@/components/FhirFindings";
import { Notice, PageHeader } from "@/components/ui";
import { Journey, TierChip } from "@/components/visuals";
import { api, FHIR_REFERRAL, FHIR_SANDBOX } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { real, type SandboxSubject } from "@/lib/real";
import { useSession } from "@/lib/session";

const STATES = [
  ...(FHIR_REFERRAL ? ["counselling_requested"] : []),
  "counselling_done", "confirmatory_requested", "confirmatory_done", "specialist_referral_requested",
  "specialist_referral_done", "closed",
];
const STATUSES = ["awaiting_counsellor", "released", "awaiting_user", "tracking", "closed"];

export default function Counsellor() {
  const { t, td } = useI18n();
  const { persona } = useSession();
  const qc = useQueryClient();
  const [sel, setSel] = useState("demo-case");
  const [evidence, setEvidence] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [tier, setTier] = useState(0);
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const queue = useQuery({ queryKey: ["queue"], queryFn: api.queue });
  const brief = useQuery({ queryKey: ["brief", sel], queryFn: () => api.brief(sel) });
  const steps = useQuery({ queryKey: ["referral"], queryFn: api.referral });
  const decide = useMutation({ mutationFn: (d: string) => api.decide(sel, d), onSuccess: () => qc.invalidateQueries() });
  const event = useMutation({
    mutationFn: (e: string) => api.referralEvent(sel, e, evidence),
    onSuccess: () => { setErr(""); qc.invalidateQueries(); },
    onError: () => setErr(t("counsellor.closureNeeds")),
  });
  const brief_ = (b: string) => (b.startsWith("finding_") ? `${t("brief.finding")} ${b.slice(8)}` : td(`brief.${b}`));
  const rows = queue.data ?? [];
  const shown = useMemo(() => rows
    .filter((r) => (!tier || r.tier === tier) && (!status || r.status === status) && (!overdueOnly || (r.due_days ?? 0) < 0) && r.id.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.tier - a.tier || (a.due_days ?? 0) - (b.due_days ?? 0)), [rows, tier, status, overdueOnly, q]);
  const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;
  const due = (d?: number) => (d === undefined ? "" : d < 0 ? t("counsellor.overdueBy").replace("{n}", String(-d)) : d === 0 ? t("counsellor.today") : t("counsellor.inDays").replace("{n}", String(d)));
  const current = rows.find((r) => r.id === sel);

  return (
    <section className="space-y-6">
      <PageHeader title={t("counsellor.title")} lead={t("counsellor.lead")} />
      {FHIR_SANDBOX && persona === "counsellor" && <FhirReview />}
      {persona === "counsellor" && <ReviewQueue />}
      {persona === "counsellor" && <PrepReview />}
      <dl data-demo="workload" className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t("counsellor.workload")}>
        {[[t("counsellor.open"), count((r) => r.status !== "closed")], [t("tier.3"), count((r) => r.tier === 3 && r.status !== "closed")],
          [t("counsellor.waiting"), count((r) => r.status === "awaiting_counsellor")], [t("next.overdue"), count((r) => (r.due_days ?? 0) < 0 && r.status !== "closed")]].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-line bg-surface px-4 py-3">
            <dt className="text-xs text-muted">{k}</dt><dd className="text-2xl font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="card-flush" data-demo="queue">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <label className="relative block min-w-[10rem] flex-1">
            <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="field ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("counsellor.search")} aria-label={t("counsellor.search")} />
          </label>
          <div role="group" aria-label={t("counsellor.tier")} className="seg">
            {[0, 3, 2, 1].map((x) => <button key={x} data-demo={x ? `tier-${x}` : "tier-all"} aria-pressed={tier === x} onClick={() => setTier(x)}>{x === 0 ? t("counsellor.all") : `${t("counsellor.tier")} ${x}`}</button>)}
          </div>
          <select className="field w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("counsellor.status")}>
            <option value="">{t("counsellor.status")}: {t("counsellor.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{td(`status.${s}`)}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--b600))]" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />{t("next.overdue")}</label>
        </div>
        <div className="max-h-[22rem] overflow-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="sticky top-0 bg-sunk text-xs text-muted">
              <tr>{["counsellor.case", "counsellor.tier", "counsellor.status", "counsellor.language", "counsellor.due"].map((k) => <th key={k} className="px-4 py-2 text-start font-semibold">{t(k)}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} onClick={() => setSel(r.id)} aria-selected={sel === r.id} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(r.id)}
                  className={`cursor-pointer border-t border-line transition-colors hover:bg-brand-50 ${sel === r.id ? "bg-brand-50" : ""}`}>
                  <td className="px-4 py-2.5 font-medium tabular-nums" dir="ltr">{r.id}</td>
                  <td className="px-4 py-2.5"><TierChip tier={r.tier} /></td>
                  <td className="px-4 py-2.5">{td(`status.${r.status}`)}</td>
                  <td className="px-4 py-2.5 text-muted">{(r.language ?? "").toUpperCase()} · {t(`level.${r.reading_level ?? "standard"}_short`)}</td>
                  <td className={`px-4 py-2.5 ${(r.due_days ?? 0) < 0 && r.status !== "closed" ? "font-semibold text-unsure-fg" : "text-muted"}`}>{r.status === "closed" ? "—" : due(r.due_days)}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">{t("palette.none")}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">{shown.length} / {rows.length}</p>
      </div>

      {current && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold" dir="ltr">{current.id}</h2><TierChip tier={current.tier} /></div>
          <div className="card" data-demo="brief">
            <h3 className="mb-3 font-semibold">{t("counsellor.brief")}</h3>
            <ul className="list-disc space-y-1 ps-5">{brief.data?.map((b, i) => <li key={i}>{brief_(b)}</li>)}</ul>
          </div>
          {sel === "demo-case" && (
            <>
              <div className="card flex flex-wrap items-center gap-2">
                <h3 className="me-auto font-semibold">{t("counsellor.decision")}</h3>
                <button className="btn" data-demo="approve" onClick={() => decide.mutate("approve")}><Check aria-hidden className="h-4 w-4" />{t("counsellor.approve")}</button>
                <button className="btn-quiet" onClick={() => decide.mutate("edit")}><Pencil aria-hidden className="h-4 w-4" />{t("counsellor.edit")}</button>
                <button className="btn-quiet" onClick={() => decide.mutate("hold")}><Pause aria-hidden className="h-4 w-4" />{t("counsellor.hold")}</button>
              </div>
              <div className="card space-y-4" data-demo="referral">
                <h3 className="font-semibold">{t("counsellor.referral")}</h3>
                <Journey current={steps.data?.[steps.data.length - 1]?.state ?? "result_released"} overdue={steps.data?.[steps.data.length - 1]?.overdue} />
                <label className="block text-sm font-medium">
                  <span className="block">{t("counsellor.evidence")}</span>
                  <input className="field mt-1 max-w-sm" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
                </label>
                <div className="flex flex-wrap gap-2">{STATES.map((s) => <button key={s} data-demo={s === "closed" ? "close-case" : undefined} className="btn-quiet btn-sm" onClick={() => event.mutate(s)}>{td(`state.${s}`)}</button>)}</div>
                {err && <div role="alert" data-demo="close-refused"><Notice>{err}</Notice></div>}
                {FHIR_REFERRAL && persona === "counsellor" && <FhirReferral />}
              </div>
            </>
          )}
          {sel !== "demo-case" && <Notice>{t("counsellor.sampleOnly")}</Notice>}
        </div>
      )}
    </section>
  );
}

function FhirReferral() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [monitor, setMonitor] = useState(false);
  const sync = useQuery({
    queryKey: ["fhir-referral"], queryFn: () => real.fhirReferral("sync"), enabled: monitor, retry: false,
    refetchInterval: ({ state }) => state.data?.state === "completed" || state.error ? false : 10_000,
  });
  const send = useMutation({
    mutationFn: () => real.fhirReferral("send"),
    onSuccess: (record) => {
      qc.setQueryData(["fhir-referral"], record);
      setMonitor(record.state !== "completed");
      qc.invalidateQueries({ queryKey: ["referral"] });
    },
  });
  const record = !sync.isError && sync.data;
  useEffect(() => {
    if (record && record.state === "completed") {
      setMonitor(false);
      qc.invalidateQueries({ queryKey: ["referral"] });
    }
  }, [qc, record]);
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <button className="btn-quiet" disabled={send.isPending || sync.isFetching} onClick={() => send.mutate()}>
        {t("referralDelivery.send")}
      </button>
      <button className="btn-quiet" disabled={send.isPending || sync.isFetching} onClick={() => {
        setMonitor(true);
        sync.refetch();
      }}>{t("referralDelivery.sync")}</button>
    </div>
    {(send.isError || sync.isError) && <p role="alert">{t("referralDelivery.error")}</p>}
    {record && record.task_id && record.synced_at && <dl aria-live="polite">
      <dt>{t("referralDelivery.request")}</dt><dd>{record.request_id}</dd>
      <dt>{t("referralDelivery.task")}</dt><dd>{record.task_id}</dd>
      <dt>{t("referralDelivery.lastSync")}</dt>
      <dd><time dateTime={new Date(record.synced_at * 1000).toISOString()}>
        {new Date(record.synced_at * 1000).toLocaleString(lang)}
      </time></dd>
    </dl>}
  </div>;
}

function FhirReview() {
  const { t } = useI18n();
  const [subject, setSubject] = useState<SandboxSubject>("synthetic-a");
  const [selected, setSelected] = useState<SandboxSubject | null>(null);
  const review = useQuery({
    queryKey: ["fhir-review", selected], enabled: selected !== null,
    queryFn: () => real.reviewFhirImport(selected!), refetchInterval: 5_000, retry: false,
  });
  const approve = useMutation({
    mutationFn: ({ patient, snapshot }: { patient: SandboxSubject; snapshot: string }) =>
      real.approveFhirImport(patient, snapshot),
    onSettled: () => review.refetch(),
  });
  const record = review.isSuccess ? review.data : null;
  return <section className="card space-y-3" aria-labelledby="fhir-review-heading">
    <h2 id="fhir-review-heading" className="text-lg font-semibold">{t("fhirImport.review")}</h2>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
      event.preventDefault();
      approve.reset();
      if (selected === subject) review.refetch();
      else setSelected(subject);
    }}>
      <label>
        {t("labSandbox.participant")}
        <select className="field mt-1" value={subject} onChange={(event) => {
          setSelected(null);
          setSubject(event.target.value === "synthetic-a" ? "synthetic-a" : "synthetic-b");
        }}>
          <option value="synthetic-a">{t("persona.person_a")}</option>
          <option value="synthetic-b">{t("persona.person_b")}</option>
        </select>
      </label>
      <button className="btn-quiet" disabled={approve.isPending}>{t("fhirImport.open")}</button>
    </form>
    {(review.isError || approve.isError) && <p role="alert">{t("fhirPreview.error")}</p>}
    {review.isSuccess && review.data === null && <p role="status">{t("labSandbox.noConsent")}</p>}
    {record && <>
      <p role="status">{t(`fhirImport.${record.state}`)}</p>
      {record.report && <FhirFindings report={record.report} />}
      {record.state === "pending" && !record.can_approve && <p>{t("fhirImport.blocked")}</p>}
      {record.can_approve && selected && <button className="btn" disabled={approve.isPending}
        onClick={() => approve.mutate({ patient: selected, snapshot: record.snapshot_id })}>{t("labSandbox.approve")}</button>}
    </>}
  </section>;
}

// The preparation sheet a person chose to share: only the switched-on sections arrive, and none at all without consent.
function PrepReview() {
  const { t } = useI18n();
  const [subject, setSubject] = useState("synthetic-a");
  const review = useQuery({ queryKey: ["prep-review", subject], queryFn: () => api.counsellorPrep(subject), refetchInterval: 15_000, retry: false });
  const s = review.data?.sections as { values?: string[]; concerns?: string[]; worries_text?: string; questions?: { id: string; text: string }[]; bring?: string[] } | undefined;
  return <section className="card space-y-3" aria-labelledby="prep-review-heading" data-demo="prep-review">
    <h2 id="prep-review-heading" className="text-lg font-semibold">{t("prep.counsellor.title")}</h2>
    <label className="block text-sm">{t("labSandbox.participant")}
      <select className="field mt-1 max-w-xs" value={subject} onChange={(e) => setSubject(e.target.value)}>
        <option value="synthetic-a">{t("persona.person_a")}</option><option value="synthetic-b">{t("persona.person_b")}</option>
      </select>
    </label>
    {review.isError && <p role="alert">{t("fhirPreview.error")}</p>}
    {review.isSuccess && !s && <p role="status">{t("prep.counsellor.none")}</p>}
    {s && <div className="space-y-2 text-sm">
      {s.questions && <div><h3 className="font-semibold">{t("prep.step.questions")}</h3><ol className="list-decimal ps-5">{s.questions.map((q) => <li key={q.id}>{q.text}</li>)}</ol></div>}
      {s.concerns && <div><h3 className="font-semibold">{t("prep.step.worries")}</h3><ul className="list-disc ps-5">{s.concerns.map((c) => <li key={c}>{c.replaceAll("_", " ")}</li>)}</ul>{s.worries_text && <p className="whitespace-pre-line">{s.worries_text}</p>}</div>}
      {s.values && <div><h3 className="font-semibold">{t("prep.step.values")}</h3><ul className="list-disc ps-5">{s.values.map((v) => <li key={v}>{t(`values.${v}`)}</li>)}</ul></div>}
      {s.bring && <div><h3 className="font-semibold">{t("prep.step.bring")}</h3><ul className="list-disc ps-5">{s.bring.map((b) => <li key={b}>{b.replaceAll("_", " ")}</li>)}</ul></div>}
    </div>}
  </section>;
}

// One queue for everything a counsellor must see first (issue 40). Items that release a result are approved in their own
// review, which is bound to the exact revision; the queue links there instead of approving blind.
function ReviewQueue() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ["review-queue"], queryFn: api.reviewQueue, refetchInterval: 15_000 });
  const decide = useMutation({ mutationFn: ({ id, d }: { id: string; d: "approve" | "hold" | "more_info" }) => api.decideReview(id, d, d === "approve" ? "reviewed" : d === "hold" ? "needs_more_time" : "needs_information"),
    onSettled: () => { qc.invalidateQueries({ queryKey: ["review-queue"] }); qc.invalidateQueries({ queryKey: ["my-reviews"] }); } });
  const rows = queue.data ?? [];
  const days = (at: number) => Math.round((at - Date.now() / 1000) / 86400);
  return <section className="card space-y-3" aria-labelledby="review-queue-heading" data-demo="review-queue">
    <h2 id="review-queue-heading" className="text-lg font-semibold">{t("review.title")}</h2>
    {queue.isError && <p role="alert">{t("fhirPreview.error")}</p>}
    {queue.isSuccess && !rows.length && <p role="status" className="text-sm text-muted">{t("review.empty")}</p>}
    <ul className="divide-y divide-line">{rows.map((r) => (
      <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
        <span className="font-semibold">{t(`review.kind.${r.kind}`)}</span>
        <span className="chip bg-sunk">{t(`review.state.${r.state}`)}</span>
        <span className="text-muted">{days(r.due_at) < 0 ? t("counsellor.overdueBy").replace("{n}", String(-days(r.due_at))) : t("counsellor.inDays").replace("{n}", String(days(r.due_at)))}</span>
        <span className="ms-auto flex flex-wrap gap-2">
          {r.dedicated ? <a className="btn-quiet btn-sm" href={r.link}>{t("review.open")}</a>
            : <button className="btn-quiet btn-sm" disabled={decide.isPending || r.state === "approved"} onClick={() => decide.mutate({ id: r.id, d: "approve" })}>{t("counsellor.approve")}</button>}
          <button className="btn-quiet btn-sm" disabled={decide.isPending || !["pending", "more_info"].includes(r.state)} onClick={() => decide.mutate({ id: r.id, d: "hold" })}>{t("counsellor.hold")}</button>
          <button className="btn-quiet btn-sm" disabled={decide.isPending || !["pending", "held"].includes(r.state)} onClick={() => decide.mutate({ id: r.id, d: "more_info" })}>{t("review.askMore")}</button>
        </span>
      </li>))}</ul>
  </section>;
}
