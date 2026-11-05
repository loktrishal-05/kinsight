// Live ClinVar lookup straight from NCBI (public, CORS-enabled). Only variation ids are sent; no person or result data.
const URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
const CLASSES: Record<string, number> = { benign: 1, "likely benign": 2, "uncertain significance": 3, "likely pathogenic": 4, pathogenic: 5 };
const classOf = (text: string) => (text.toLowerCase().startsWith("pathogenic/likely pathogenic") ? 5 : CLASSES[text.toLowerCase().trim()]);

export async function liveReclassify(archived: Record<string, number>) {
  const ids = Object.keys(archived);
  if (!ids.length || ids.length > 50 || ids.some((i) => !/^\d{1,12}$/.test(i))) throw new Error("422");
  const res = await fetch(`${URL}?db=clinvar&retmode=json&tool=kinsight&id=${ids.join(",")}`);
  if (!res.ok) throw new Error(String(res.status));
  const result = (await res.json()).result ?? {};
  const alerts = ids.flatMap((variant) => {
    const to = classOf(result[variant]?.germline_classification?.description ?? "");
    const from = archived[variant];
    return to && (from >= 4) !== (to >= 4) ? [{ variant, from, to, direction: to >= 4 ? ("upgraded" as const) : ("downgraded" as const), needs_clinician_review: true }] : [];
  });
  return { alerts };
}

// Browse the pathogenic records ClinVar holds for one gene (first 15, most relevant first).
const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
export async function exploreGene(gene: string) {
  const symbol = gene.trim().toUpperCase();
  if (!/^[A-Z0-9-]{2,15}$/.test(symbol)) throw new Error("422");
  const term = encodeURIComponent(`${symbol}[gene] AND "clinsig pathogenic"[Properties]`);
  const found = await fetch(`${BASE}esearch.fcgi?db=clinvar&retmode=json&retmax=15&sort=relevance&tool=kinsight&term=${term}`);
  if (!found.ok) throw new Error(String(found.status));
  const search = (await found.json()).esearchresult ?? {};
  const ids: string[] = search.idlist ?? [];
  if (!ids.length) return { total: 0, rows: [] as { id: string; title: string; label: string; review: string }[] };
  const sum = await fetch(`${BASE}esummary.fcgi?db=clinvar&retmode=json&tool=kinsight&id=${ids.join(",")}`);
  if (!sum.ok) throw new Error(String(sum.status));
  const result = (await sum.json()).result ?? {};
  return {
    total: Number(search.count ?? ids.length),
    rows: ids.map((id) => ({ id, title: String(result[id]?.title ?? id), label: String(result[id]?.germline_classification?.description ?? ""), review: String(result[id]?.germline_classification?.review_status ?? "") })),
  };
}
