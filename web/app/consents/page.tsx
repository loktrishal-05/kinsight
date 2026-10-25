"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Consents() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["consents"], queryFn: api.consents });
  const revoke = useMutation({ mutationFn: api.revoke, onSuccess: () => qc.invalidateQueries() });
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("consent.title")}</h1>
      {list.data?.length === 0 && <p>{t("consent.none")}</p>}
      <ul className="space-y-2">
        {list.data?.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{c.scope} · {c.purpose}</p>
              <p className="text-sm text-slate-600">{t("consent.expires")}: {new Date(c.expires_at * 1000).toLocaleDateString(undefined, { numberingSystem: "latn" })}</p>
            </div>
            {c.revoked_at ? <span>{t("consent.revoked")}</span> : <button className="btn-quiet" onClick={() => revoke.mutate(c.id)}>{t("consent.revoke")}</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
