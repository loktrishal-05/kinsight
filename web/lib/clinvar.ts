// Live ClinVar lookup straight from NCBI (public, CORS-enabled). Only variation ids are sent; no person or result data.
const URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
const CLASSES: Record<string, number> = { benign: 1, "likely benign": 2, "uncertain significance": 3, "likely pathogenic": 4, pathogenic: 5 };
const classOf = (text: string) => (text.toLowerCase().startsWith("pathogenic/likely pathogenic") ? 5 : CLASSES[text.toLowerCase().trim()]);

export type ClinVarCheck = {
  alerts: { variant: string; from: number; to: number; direction: "upgraded" | "downgraded"; needs_clinician_review: boolean }[];
  classes: Record<string, {
    label: string;
    provenance: { source: string; version: string | null; fetched_at: string; url: string };
  }>;
};

async function fetchSummaries(ids: string[]) {
  const res = await fetch(`${URL}?db=clinvar&retmode=json&tool=kinsight&id=${ids.join(",")}`);
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  if (data?.error || !data?.result || Array.isArray(data.result) || typeof data.result !== "object" || data.result.error) throw new Error("503");
  return data.result;
}

export async function liveReclassify(archived: Record<string, number>): Promise<ClinVarCheck> {
  const ids = Object.keys(archived);
  if (!ids.length || ids.length > 50 || ids.some((i) => !/^\d{1,12}$/.test(i))) throw new Error("422");
  const result = await fetchSummaries(ids);
  const alerts = ids.flatMap((variant) => {
    const to = classOf(result[variant]?.germline_classification?.description ?? "");
    const from = archived[variant];
    return to && (from >= 4) !== (to >= 4) ? [{ variant, from, to, direction: to >= 4 ? ("upgraded" as const) : ("downgraded" as const), needs_clinician_review: true }] : [];
  });
  const fetched_at = new Date().toISOString();
  const classes = Object.fromEntries(ids.map((id) => [id, {
    label: String(result[id]?.germline_classification?.description ?? ""),
    provenance: { source: "NCBI ClinVar", fetched_at, version: result[id]?.accession_version ?? null,
      url: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${id}/` },
  }]));
  return { alerts, classes };
}

// Browse the pathogenic records ClinVar holds for one gene (first 15, most relevant first).
const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
export async function exploreGene(gene: string) {
  const symbol = gene.trim().toUpperCase();
  if (!/^[A-Z0-9-]{2,15}$/.test(symbol)) throw new Error("422");
  const term = encodeURIComponent(`${symbol}[gene] AND "clinsig pathogenic"[Properties]`);
  const found = await fetch(`${BASE}esearch.fcgi?db=clinvar&retmode=json&retmax=15&sort=relevance&tool=kinsight&term=${term}`);
  if (!found.ok) throw new Error(String(found.status));
  const data = await found.json();
  const search = data?.esearchresult;
  if (data?.error || !Array.isArray(search?.idlist)) throw new Error("503");
  const ids: string[] = search.idlist;
  if (!ids.length) return { total: 0, rows: [] as { id: string; title: string; label: string; review: string }[] };
  if (ids.some((id) => typeof id !== "string" || !/^\d{1,12}$/.test(id))) throw new Error("503");
  const result = await fetchSummaries(ids);
  return {
    total: Number(search.count ?? ids.length),
    rows: ids.map((id) => ({ id, title: String(result[id]?.title ?? id), label: String(result[id]?.germline_classification?.description ?? ""), review: String(result[id]?.germline_classification?.review_status ?? "") })),
  };
}
