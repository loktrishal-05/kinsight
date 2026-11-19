"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareText } from "lucide-react";
import Link from "next/link";
import FhirFindings from "@/components/FhirFindings";
import { Notice, PageHeader, Paragraphs, StatusChip } from "@/components/ui";
import { ReadAloud } from "@/components/Voice";
import { api, FHIR_REFERRAL, FHIR_SANDBOX } from "@/lib/api";
import { rowLabel } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";
import { real } from "@/lib/real";
import { useSession } from "@/lib/session";

export default function MyResult() {
  const { t, lang, level } = useI18n();
  const { persona } = useSession();
  const qc = useQueryClient();
  const results = useQuery({ queryKey: ["results"], queryFn: api.results });
  const expl = useQuery({ queryKey: ["expl", lang, level], queryFn: () => api.explanation(lang, level) });
  const talk = useMutation({ mutationFn: () => api.requestCounselling(), onSuccess: () => qc.invalidateQueries({ queryKey: ["referral"] }) });
  const delivery = useMutation({ mutationFn: () => real.allowFhirReferral(t("referralDelivery.consent")) });
  return (
    <section className="space-y-6">
      <PageHeader title={t("result.title")} lead={t("result.lead")}
        action={<Link className="btn-quiet" href="/report-compare">{t("reportCompare.title")}</Link>} />
      {FHIR_SANDBOX && (persona === "person_a" || persona === "person_b") && <FhirReportPreview key={persona} />}
      <div className="card-flush" data-demo="results">
        {results.isLoading && <p className="p-5 text-muted">{t("loading")}</p>}
        <ul className="px-5">
          {results.data?.map((r) => (
            <li key={r.condition_id} className="row">
              <span className="font-medium">{rowLabel(r, lang)}</span>
              <StatusChip status={r.status} />
            </li>
          ))}
        </ul>
      </div>
      <Notice>{t("result.carrierNote")}</Notice>
      <div className="card" data-demo="explanation">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("result.explanation")}</h2>
          <ReadAloud text={expl.data?.blocks.join(" ") ?? ""} />
        </div>
        <div className="max-w-read space-y-3" data-testid="explanation">
          <Paragraphs blocks={expl.data?.blocks ?? []} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" data-demo="talk" disabled={talk.isSuccess} onClick={() => talk.mutate()}>
          {talk.isSuccess ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : <MessageSquareText aria-hidden className="h-4 w-4" />}
          {talk.isSuccess ? t("result.talkDone") : t("result.talk")}
        </button>
        <Link className="btn-quiet" href="/prepare">{t("prep.link")}</Link>
      </div>
      {FHIR_REFERRAL && persona === "person_a" && <div className="card space-y-3">
        <p>{t("referralDelivery.consent")}</p>
        <button className="btn-quiet" disabled={delivery.isPending || delivery.isSuccess} onClick={() => delivery.mutate()}>
          {t(delivery.isSuccess ? "referralDelivery.saved" : "referralDelivery.allow")}
        </button>
        {delivery.isError && <p role="alert">{t("referralDelivery.error")}</p>}
      </div>}
    </section>
  );
}

function FhirReportPreview() {
  const { t } = useI18n();
  const preview = useMutation({
    mutationFn: real.previewFhirReport,
    retry: (attempt, error) => attempt < 2 && error.message === "409",
  });
  const saved = useQuery({
    queryKey: ["fhir-import"], queryFn: real.personalFhirImport,
    refetchInterval: (query) => preview.isPending || query.state.data?.state === "missing" ? false : 5_000,
  });
  const confirm = useMutation({
    mutationFn: real.confirmFhirImport,
    onSuccess: () => { preview.reset(); saved.refetch(); },
  });
  const report = preview.data;
  return <section className="card space-y-3" aria-labelledby="fhir-preview-heading">
    <h2 id="fhir-preview-heading" className="text-lg font-semibold">{t("fhirPreview.title")}</h2>
    <p>{t("fhirPreview.description")}</p>
    <button className="btn-quiet" disabled={saved.isFetching || preview.isPending || confirm.isPending} onClick={() => {
      confirm.reset();
      preview.mutate();
    }}>
      {t(preview.isPending ? "loading" : "fhirPreview.load")}
    </button>
    {(preview.isError || saved.isError) && <p role="alert">{t("fhirPreview.error")}</p>}
    {confirm.isError && <p role="alert">{t("fhirPreview.confirmError")}</p>}
    {saved.isSuccess && saved.data.state !== "missing" && <div className="space-y-2">
      <p aria-live="polite">{t(`fhirImport.${saved.data.state}`)}</p>
      {!report && saved.data.report && <FhirFindings report={saved.data.report} />}
    </div>}
    {report && <div className="space-y-2">
      <p role="status">{t(report.unmapped ? "fhirPreview.unmapped" : `fhirPreview.${report.state}`)}</p>
      <FhirFindings report={report} />
      {report.snapshot_id && <button className="btn" disabled={confirm.isPending}
        onClick={() => confirm.mutate(report.snapshot_id!)}>{t("fhirPreview.confirm")}</button>}
    </div>}
  </section>;
}
