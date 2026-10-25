"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserX } from "lucide-react";
import Pedigree from "@/components/Pedigree";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Family() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const ped = useQuery({ queryKey: ["pedigree"], queryFn: api.pedigree });
  const invite = useMutation({ mutationFn: api.invite, onSuccess: () => qc.invalidateQueries() });
  return (
    <section className="space-y-6">
      <PageHeader title={t("family.title")} lead={t("family.lead")} />
      <Notice>{t("family.hint")}</Notice>
      <div className="card overflow-x-auto">{ped.data && <Pedigree data={ped.data} />}</div>
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">{t("family.invite")}</h2>
          <p className="text-sm text-muted">{t("consent.scope")}: {t("scope.couple_tier_only")}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => invite.mutate("couple_tier_only")}><UserPlus aria-hidden className="h-4 w-4" />{t("family.invite")}</button>
          <button className="btn-quiet" onClick={() => invite.mutate("decline")}><UserX aria-hidden className="h-4 w-4" />{t("family.decline")}</button>
        </div>
      </div>
    </section>
  );
}
