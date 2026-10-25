"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleOff, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Consents() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["consents"], queryFn: api.consents });
  const revoke = useMutation({ mutationFn: api.revoke, onSuccess: () => qc.invalidateQueries() });
  const date = (s: number) => new Date(s * 1000).toLocaleDateString(lang === "ar" ? "ar-AE-u-nu-latn" : lang, { dateStyle: "medium" });
  return (
    <section className="space-y-6">
      <PageHeader title={t("consent.title")} lead={t("consent.lead")} />
      {list.data?.length === 0 && (
        <div className="card flex items-center gap-3 text-muted"><ShieldCheck aria-hidden className="h-5 w-5 text-brand-600" />{t("consent.none")}</div>
      )}
      {!!list.data?.length && (
        <ul className="card-flush px-5">
          {list.data.map((c) => (
            <li key={c.id} className="row flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold">{t(`scope.${c.scope}`)}</p>
                <p className="text-sm text-muted">{t("consent.with")}: {c.grantee_id} · {t(`purpose.${c.purpose}`)} · {t("consent.expires")} {date(c.expires_at)}</p>
              </div>
              {c.revoked_at
                ? <span className="chip bg-clear-bg text-clear-fg"><CircleOff aria-hidden className="h-3.5 w-3.5" />{t("consent.revoked")}</span>
                : <button className="btn-quiet btn-sm" onClick={() => revoke.mutate(c.id)}>{t("consent.revoke")}</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
