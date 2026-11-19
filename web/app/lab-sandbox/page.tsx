"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState, Notice, PageHeader, Skeleton } from "@/components/ui";
import { LAB_SANDBOX } from "@/lib/api";
import { conditionLabel } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";
import { real, type SandboxReport, type SandboxSubject } from "@/lib/real";
import { useSession } from "@/lib/session";

const ROLES = ["demo_operator", "person_a", "person_b", "counsellor"] as const;

export default function LabSandbox() {
  const { t } = useI18n();
  const { persona, choose } = useSession();
  const change = useMutation({ mutationFn: choose });
  return <section className="space-y-6">
    <PageHeader title={t("labSandbox.title")} lead={t("labSandbox.lead")} />
    {!LAB_SANDBOX ? <Notice>{t("labSandbox.unavailable")}</Notice> : <>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => <button key={role} className="btn-quiet" aria-pressed={persona === role}
          disabled={change.isPending} onClick={() => change.mutate(role)}>{t(`persona.${role}`)}</button>)}
      </div>
      {change.isError && <Failure />}
      {!change.isPending && (persona === "person_a" || persona === "person_b") && <PersonalReport key={persona} />}
      {!change.isPending && persona === "demo_operator" && <Workstation lab />}
      {!change.isPending && persona === "counsellor" && <Workstation key={persona} lab={false} />}
    </>}
  </section>;
}

function Failure() {
  const { t } = useI18n();
  return <ErrorState>{t("labSandbox.error")}</ErrorState>;
}

function Report({ report }: { report: SandboxReport }) {
  const { lang, t } = useI18n();
  return <>
    <p>{t("labSandbox.revision")} {report.revision} · <time dateTime={report.issued_at}>{new Date(report.issued_at).toLocaleString(lang)}</time></p>
    <ul>
      {Object.entries(report.findings).map(([id, status]) => <li key={id} className="row">
        <span>{conditionLabel(id, lang)}</span><span>{t(`labSandbox.finding.${status}`)}</span>
      </li>)}
    </ul>
  </>;
}

function PersonalReport() {
  const { t } = useI18n();
  const result = useQuery({ queryKey: ["personal-lab-report"], queryFn: real.personalLabReport, refetchInterval: 5_000, refetchIntervalInBackground: true });
  const share = useMutation({ mutationFn: real.shareLabReport });
  return <div className="card space-y-4">
    <p>{t("labSandbox.shareText")}</p>
    <button className="btn" onClick={() => share.mutate()} disabled={share.isPending || share.isSuccess}>{t("labSandbox.share")}</button>
    {share.isSuccess && <p role="status">{t("labSandbox.shared")}</p>}
    {(result.isError || share.isError) && <Failure />}
    {result.isPending && <Skeleton lines={3} />}
    {result.isSuccess && <>
      <p role="status">{t(`labSandbox.${result.data.state}`)}{result.data.revision ? ` · ${t("labSandbox.revision")} ${result.data.revision}` : ""}</p>
      {result.data.report && <Report report={result.data.report} />}
    </>}
  </div>;
}

function Workstation({ lab }: { lab: boolean }) {
  const { t } = useI18n();
  const [subject, setSubject] = useState<SandboxSubject>("synthetic-a");
  return <div className="card space-y-4">
    <label className="block">{t("labSandbox.participant")}
      <select className="field mt-1" value={subject} onChange={(event) => setSubject(event.target.value === "synthetic-a" ? "synthetic-a" : "synthetic-b")}>
        <option value="synthetic-a">{t("persona.person_a")}</option>
        <option value="synthetic-b">{t("persona.person_b")}</option>
      </select>
    </label>
    {lab ? <Intake key={subject} subject={subject} /> : <Review key={subject} subject={subject} />}
  </div>;
}

function Intake({ subject }: { subject: SandboxSubject }) {
  const { t } = useI18n();
  const [revision, setRevision] = useState("1");
  const send = useMutation({ mutationFn: (status: "final" | "corrected") => real.sendLabReport(subject, Number(revision), status) });
  return <form className="space-y-4" onSubmit={(event) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    send.mutate(submitter?.value === "corrected" ? "corrected" : "final");
  }}>
    <label className="block">{t("labSandbox.revision")}
      <input className="field mt-1" type="number" min="1" max="1000000" step="1" required value={revision} onChange={(event) => { setRevision(event.target.value); send.reset(); }} />
    </label>
    <div className="flex flex-wrap gap-2">
      <button className="btn" type="submit" value="final" disabled={send.isPending}>{t("labSandbox.send")}</button>
      <button className="btn-quiet" type="submit" value="corrected" disabled={send.isPending}>{t("labSandbox.correct")}</button>
    </div>
    {send.isSuccess && <p role="status">{t("labSandbox.received")}</p>}
    {send.isError && <Failure />}
  </form>;
}

function Review({ subject }: { subject: SandboxSubject }) {
  const { t } = useI18n();
  const query = useQuery({ queryKey: ["lab-review", subject], queryFn: () => real.reviewLabReport(subject), refetchInterval: 5_000 });
  const approve = useMutation({ mutationFn: (revision: number) => real.approveLabReport(subject, revision), onSettled: () => query.refetch() });
  if (query.isPending) return <p role="status">{t("loading")}</p>;
  if (query.isError) return <Failure />;
  if (!query.data) return <p role="status">{t("labSandbox.noConsent")}</p>;
  const { report, approved } = query.data;
  if (!report) return <p role="status">{t("labSandbox.missing")}</p>;
  return <>
    <Report report={report} />
    {approved ? <p role="status">{t("labSandbox.released")}</p> :
      ["final", "amended", "corrected"].includes(report.status) && <button className="btn" disabled={approve.isPending}
        onClick={() => approve.mutate(report.revision)}>{t("labSandbox.approve")}</button>}
    {approve.isError && <Failure />}
  </>;
}
