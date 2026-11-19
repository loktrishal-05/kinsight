"use client";
import { useMutation } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import Pedigree from "@/components/Pedigree";
import { Notice } from "@/components/ui";
import { api, MOCK, type Pedigree as PedigreeData } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { layoutPedigree, type Edge } from "@/lib/pedigreeLayout";

type Person = { id: string; sex: "male" | "female"; label: string; living: boolean; tested: "unknown" | "tested" | "not_tested" };
export type Draft = { people: Person[]; edges: Edge[] };
const RELATIONS = ["parent", "child", "partner", "sibling"] as const;

// The draft comes from the saved tree: people with their parents, plus partner links.
export function toDraft(p: PedigreeData): Draft {
  const people = p.people.map((x) => ({ id: x.id, sex: x.sex, label: x.label ?? x.id, living: true, tested: "unknown" as const }));
  const edges: Edge[] = [
    ...p.people.flatMap((x) => (x.parents ?? []).map((parent) => ({ a_id: parent, b_id: x.id, type: "parent_of" as const }))),
    ...(p.relationships ?? []).filter((e) => e.type === "partner_of").map((e) => ({ a_id: e.a_id, b_id: e.b_id, type: "partner_of" as const })),
  ];
  return { people, edges };
}

// Adds a relative and the links that make the relation true (a sibling shares both parents).
export function addRelative(d: Draft, anchor: string, relation: (typeof RELATIONS)[number], sex: Person["sex"], label: string, id: string): Draft {
  const person: Person = { id, sex, label: label || id, living: true, tested: "unknown" };
  const parents = d.edges.filter((e) => e.type === "parent_of" && e.b_id === anchor).map((e) => e.a_id);
  const links: Edge[] = relation === "parent" ? [{ a_id: id, b_id: anchor, type: "parent_of" }]
    : relation === "child" ? [{ a_id: anchor, b_id: id, type: "parent_of" }, ...d.edges.filter((e) => e.type === "partner_of" && (e.a_id === anchor || e.b_id === anchor)).map((e) => ({ a_id: e.a_id === anchor ? e.b_id : e.a_id, b_id: id, type: "parent_of" as const }))]
    : relation === "partner" ? [{ a_id: anchor, b_id: id, type: "partner_of" }]
    : parents.map((p) => ({ a_id: p, b_id: id, type: "parent_of" as const }));
  return { people: [...d.people, person], edges: [...d.edges, ...links] };
}

export function removePerson(d: Draft, id: string): Draft {
  return { people: d.people.filter((p) => p.id !== id), edges: d.edges.filter((e) => e.a_id !== id && e.b_id !== id) };
}

export default function PedigreeBuilder({ initial, onSaved }: { initial: Draft; onSaved: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(initial);
  const [anchor, setAnchor] = useState(initial.people[0]?.id ?? "");
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>("parent");
  const [sex, setSex] = useState<Person["sex"]>("female");
  const [label, setLabel] = useState("");
  const partners = draft.edges.filter((e) => e.type === "partner_of");
  const [pair, setPair] = useState<string>(partners[0] ? `${partners[0].a_id}|${partners[0].b_id}` : "");
  const name = (id: string) => draft.people.find((p) => p.id === id)?.label || id;
  const preview = useMemo(() => ({ people: layoutPedigree(draft.edges, draft.people).map((p) => ({ ...p, label: name(p.id).slice(0, 6) })), related: [], relationships: draft.edges.map((e) => ({ ...e, confidence: "known" as const })), warnings: [] }), [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const kin = useMutation({ mutationFn: () => { const [a, b] = pair.split("|"); return api.kinship(draft, a, b); } });
  const save = useMutation({ mutationFn: () => api.savePedigree(draft), onSuccess: onSaved });
  const edit = (id: string, patch: Partial<Person>) => setDraft({ ...draft, people: draft.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <section className="card space-y-5" aria-labelledby="builder-title" data-demo="builder">
      <h2 id="builder-title" className="text-lg font-semibold">{t("builder.title")}</h2>
      <p className="text-sm text-muted">{t("builder.lead")}</p>
      <div className="overflow-x-auto" aria-hidden><Pedigree data={preview as unknown as PedigreeData} /></div>

      <table className="w-full text-sm">
        <caption className="mb-2 text-start font-semibold">{t("builder.people")}</caption>
        <thead><tr className="text-xs text-muted">{["builder.name", "builder.sex", "builder.living", "builder.tested", "builder.parents", ""].map((k) => <th key={k} scope="col" className="py-1 text-start font-semibold">{k && t(k)}</th>)}</tr></thead>
        <tbody>{draft.people.map((p) => (
          <tr key={p.id} className="border-t border-line" data-person={p.id}>
            <th scope="row" className="py-1 pe-2 font-normal"><input className="field h-8" aria-label={`${t("builder.name")} ${p.id}`} maxLength={40} value={p.label} onChange={(e) => edit(p.id, { label: e.target.value })} /></th>
            <td className="pe-2"><select className="field h-8" aria-label={`${t("builder.sex")} ${p.label}`} value={p.sex} onChange={(e) => edit(p.id, { sex: e.target.value as Person["sex"] })}><option value="female">{t("builder.female")}</option><option value="male">{t("builder.male")}</option></select></td>
            <td className="pe-2"><input type="checkbox" className="h-4 w-4" aria-label={`${t("builder.living")} ${p.label}`} checked={p.living} onChange={(e) => edit(p.id, { living: e.target.checked })} /></td>
            <td className="pe-2"><select className="field h-8" aria-label={`${t("builder.tested")} ${p.label}`} value={p.tested} onChange={(e) => edit(p.id, { tested: e.target.value as Person["tested"] })}>{(["unknown", "tested", "not_tested"] as const).map((v) => <option key={v} value={v}>{t(`builder.tested.${v}`)}</option>)}</select></td>
            <td className="pe-2 text-muted">{draft.edges.filter((e) => e.type === "parent_of" && e.b_id === p.id).map((e) => name(e.a_id)).join(", ") || "—"}</td>
            <td><button type="button" className="btn-quiet btn-sm" aria-label={`${t("builder.remove")} ${p.label}`} onClick={() => setDraft(removePerson(draft, p.id))}><Trash2 aria-hidden className="h-3.5 w-3.5" /></button></td>
          </tr>))}</tbody>
      </table>

      <form className="grid gap-2 sm:grid-cols-5" aria-label={t("builder.add")} onSubmit={(e) => { e.preventDefault(); setDraft(addRelative(draft, anchor, relation, sex, label.trim(), `p${Date.now().toString(36)}`)); setLabel(""); }}>
        <label className="text-xs font-medium">{t("builder.relationTo")}<select className="field mt-1" value={anchor} onChange={(e) => setAnchor(e.target.value)}>{draft.people.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <label className="text-xs font-medium">{t("builder.relation")}<select className="field mt-1" value={relation} onChange={(e) => setRelation(e.target.value as (typeof RELATIONS)[number])}>{RELATIONS.map((r) => <option key={r} value={r}>{t(`builder.rel.${r}`)}</option>)}</select></label>
        <label className="text-xs font-medium">{t("builder.sex")}<select className="field mt-1" value={sex} onChange={(e) => setSex(e.target.value as Person["sex"])}><option value="female">{t("builder.female")}</option><option value="male">{t("builder.male")}</option></select></label>
        <label className="text-xs font-medium">{t("builder.name")}<input className="field mt-1" maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} /></label>
        <button className="btn-quiet self-end"><Plus aria-hidden className="h-4 w-4" />{t("builder.add")}</button>
      </form>

      <div className="space-y-2 rounded-lg border border-line p-3" data-demo="relatedness" data-not-risk>
        <label className="block text-sm font-medium">{t("builder.couple")}
          <select className="field mt-1 max-w-sm" value={pair} onChange={(e) => { setPair(e.target.value); kin.reset(); }}>
            {partners.map((e) => <option key={`${e.a_id}|${e.b_id}`} value={`${e.a_id}|${e.b_id}`}>{name(e.a_id)} + {name(e.b_id)}</option>)}
          </select></label>
        <button type="button" className="btn-quiet btn-sm" disabled={!pair || kin.isPending} onClick={() => kin.mutate()}>{t("builder.check")}</button>
        {kin.isSuccess && <p role="status">{kin.data.related ? t("builder.related").replace("{phi}", `1/${Math.round(1 / kin.data.phi)}`) : t("builder.unrelated")}</p>}
        {kin.isError && <p role="alert">{MOCK ? t("builder.needsService") : (kin.error as Error).message === "422" ? t("builder.impossible") : t("lifecycle.error")}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn" disabled={save.isPending} onClick={() => save.mutate()}><Save aria-hidden className="h-4 w-4" />{t("builder.save")}</button>
        {save.isSuccess && <span role="status" className="text-sm">{t("builder.saved")}</span>}
        {save.isError && <span role="alert" className="text-sm">{t("builder.impossible")}</span>}
      </div>
      <Notice>{t("builder.privacy")}</Notice>
    </section>
  );
}
