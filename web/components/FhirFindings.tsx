"use client";

import { StatusChip } from "@/components/ui";
import { conditionLabel } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";
import type { FhirPreview } from "@/lib/real";

export default function FhirFindings({ report }: { report: FhirPreview }) {
  const { t, lang } = useI18n();
  return <>
    {report.issued_at && <p>{t("labSandbox.revision")} {report.version} · <time dateTime={report.issued_at}>
      {new Date(report.issued_at).toLocaleString(lang)}
    </time></p>}
    {report.unmapped_source_ids && <ul aria-label={t("fhirPreview.unmapped")}>
      {report.unmapped_source_ids.map((id) => <li className="break-all text-muted" key={id}>{id}</li>)}
    </ul>}
    {!!report.findings.length && <ul>{report.findings.map((finding) => <li className="row" key={finding.source_id}>
      <div>
        <span>{conditionLabel(finding.condition_id, lang)}</span>
        <small className="block break-all text-muted">{finding.source_id}</small>
      </div>
      <StatusChip status={finding.status} />
    </li>)}</ul>}
  </>;
}
