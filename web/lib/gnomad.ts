// Live gnomAD v4 allele frequencies straight from the public API (CORS-enabled). Only a variant id is sent.
// Not an Emirati cohort: the Middle Eastern group is shown separately and is a rough guide only.
const URL = "https://gnomad.broadinstitute.org/api";
export const VARIANT_ID = /^(?:[1-9]|1[0-9]|2[0-2]|X|Y)-\d{1,9}-[ACGT]{1,50}-[ACGT]{1,50}$/;
const QUERY = "query($id: String!, $d: DatasetId!) { variant(variantId: $id, dataset: $d) { variant_id exome { ac an populations { id ac an } } genome { ac an populations { id ac an } } } }";

type Part = { ac: number; an: number; populations?: { id: string; ac: number; an: number }[] } | null;
const share = (ac: number, an: number) => (an > 0 ? 2 * (ac / an) * (1 - ac / an) : null);

export function summarise(v: { exome?: Part; genome?: Part } | null) {
  if (!v) return null;
  const parts = [v.exome, v.genome].filter(Boolean) as NonNullable<Part>[];
  const ac = parts.reduce((s, p) => s + p.ac, 0), an = parts.reduce((s, p) => s + p.an, 0);
  const mid = parts.flatMap((p) => (p.populations ?? []).filter((x) => x.id === "mid"));
  const mac = mid.reduce((s, x) => s + x.ac, 0), man = mid.reduce((s, x) => s + x.an, 0);
  return { allele_count: ac, allele_number: an, allele_frequency: an ? ac / an : null, carrier_share: share(ac, an),
    middle_eastern_allele_number: man, middle_eastern_carrier_share: share(mac, man) };
}

export async function liveFrequency(variants: string[]) {
  if (!variants.length || variants.length > 20 || variants.some((v) => !VARIANT_ID.test(v))) throw new Error("422");
  const out: Record<string, ReturnType<typeof summarise>> = {};
  for (const id of variants) {
    const res = await fetch(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: QUERY, variables: { id, d: "gnomad_r4" } }) });
    if (!res.ok) throw new Error(String(res.status));
    out[id] = summarise((await res.json()).data?.variant ?? null);
  }
  return { variants: out };
}
