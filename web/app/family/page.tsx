"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Pedigree from "@/components/Pedigree";

export default function Family() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const ped = useQuery({ queryKey: ["pedigree"], queryFn: api.pedigree });
  const invite = useMutation({ mutationFn: api.invite, onSuccess: () => qc.invalidateQueries() });
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("family.title")}</h1>
      <p className="note">{t("family.hint")}</p>
      <div className="card">{ped.data && <Pedigree data={ped.data} />}</div>
      <div className="card space-y-2">
        <h2 className="font-medium">{t("family.invite")}</h2>
        <p className="text-sm">{t("consent.scope")}: couple_tier_only</p>
        <div className="flex gap-2">
          <button className="btn" onClick={() => invite.mutate("couple_tier_only")}>{t("family.invite")}</button>
          <button className="btn-quiet" onClick={() => invite.mutate("decline")}>×</button>
        </div>
      </div>
    </section>
  );
}
