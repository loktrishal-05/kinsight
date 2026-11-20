import topics from "./fixtures/medlineplus-topics.json";

export const MAX_REPORT_ROWS = 1_000;
export const MAX_REPORT_LENGTH = 400_000;

export type Finding = { genes: string; condition: string; result: string; details: string };
export type ReportSource = { pages: string[]; paginated: boolean };
type ParseResult = { rows: Finding[]; error?: never } | { error: "empty" | "size" | "row"; line?: number; rows?: never };
export type ComparisonRow = { genes: string; condition: string; first: Finding[]; second: Finding[] };

export function parseReport(text: string): ParseResult {
  if (text.length > MAX_REPORT_LENGTH) return { error: "size" };
  const rows: Finding[] = [];
  let firstLine = true;
  for (const [index, line] of text.split(/\r\n|\r|\n/).entries()) {
    if (!line.trim()) continue;
    const [genes = "", condition = "", result = "", details = "", ...extra] = line.split(line.includes("\t") ? "\t" : "|").map((cell) => cell.trim());
    const isHeader = firstLine && !extra.length && /^genes?$/i.test(genes) && /^condition$/i.test(condition)
      && /^(reported )?result$/i.test(result) && (!details || /^details( \(optional\))?$/i.test(details));
    firstLine = false;
    if (isHeader) continue;
    const symbols = genes.toUpperCase().split(/\s*\/\s*/);
    if ((genes !== "-" && (symbols.length > 8 || symbols.some((symbol) => !/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(symbol)))) ||
        !condition || condition.length > 160 || !result || result.length > 160 || details.length > 500 || extra.length) {
      return { error: "row", line: index + 1 };
    }
    rows.push({ genes: [...new Set(symbols)].sort().join("/"), condition, result, details });
    if (rows.length > MAX_REPORT_ROWS) return { error: "size" };
  }
  return rows.length ? { rows } : { error: "empty" };
}

export function findingSourceKey({ genes, condition, result, details }: Finding) {
  return JSON.stringify([genes, condition, result, details]);
}

export function indexReportSource({ pages, paginated }: ReportSource) {
  const evidence = new Map<string, { text: string; page?: number } | null>();
  for (const [index, page] of pages.entries()) {
    for (const line of page.split(/\r\n|\r|\n/)) {
      if (!/[|\t]/.test(line)) continue;
      const row = parseReport(line).rows?.[0];
      if (!row) continue;
      const key = findingSourceKey(row);
      evidence.set(key, evidence.has(key) ? null : { text: line.trim(), page: paginated ? index + 1 : undefined });
    }
  }
  return evidence;
}

export function compareReports(first: Finding[], second: Finding[]): [string, ComparisonRow][] {
  const groups = new Map<string, ComparisonRow>();
  for (const [side, findings] of [["first", first], ["second", second]] as const) {
    for (const [index, finding] of findings.entries()) {
      const { genes, condition } = finding;
      const label = condition.normalize("NFC").toLowerCase().replace(/[\u2010\u2011]/g, "-").replace(/\s+/g, " ");
      const key = genes === "-" ? `${side}:${index}` : `${genes}:${label}`;
      let group = groups.get(key);
      if (!group) {
        group = { genes, condition, first: [], second: [] };
        groups.set(key, group);
      }
      group[side].push(finding);
    }
  }
  return [...groups];
}

export function suggestPdfRows(text: string): string | undefined {
  // shortcut: two verified Labcorp negative summaries, add layouts only with source fixtures and false-positive tests.
  if (!/Laboratory Corporation of America/i.test(text)) return undefined;
  const summary = text.match(/^Indication:[ \t]+Carrier Test \/ Screening\s+(Spinal Muscular Atrophy \(SMA\)|Fragile X Syndrome, Carrier)\s+Summary:[ \t]+(NEGATIVE)[ \t]*\r?$/im);
  if (!summary) return undefined;
  const finding = summary[1].toLowerCase().startsWith("spinal") ? "SMN1 | Spinal muscular atrophy" : "FMR1 | Fragile X syndrome";
  return `${finding} | ${summary[2]}`;
}

export function reportedTerm(result: string): "carrier" | "negative" | "uncertain" | "other" {
  const term = result.trim().toLowerCase();
  if (term === "carrier" || term === "carrier detected") return "carrier";
  if (term === "negative" || term === "not detected") return "negative";
  if (["vus", "vous", "uncertain", "variant of uncertain significance", "inconclusive"].includes(term)) return "uncertain";
  return "other";
}

const genes = new Set(topics.gene);
const conditions = new Set(topics.condition);

export function referenceLinks(row: { genes: string; condition: string }) {
  const links = [];
  const condition = row.condition.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (conditions.has(condition)) links.push({ label: row.condition, url: `https://medlineplus.gov/genetics/condition/${condition}` });
  for (const gene of row.genes.split("/")) {
    const slug = gene.toLowerCase();
    if (genes.has(slug)) links.push({ label: gene, url: `https://medlineplus.gov/genetics/gene/${slug}` });
  }
  return links;
}
