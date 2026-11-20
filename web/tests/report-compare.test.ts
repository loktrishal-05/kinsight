import { expect, test } from "vitest";
import { compareReports, findingSourceKey, indexReportSource, MAX_REPORT_LENGTH, MAX_REPORT_ROWS, parseReport, referenceLinks, reportedTerm, suggestPdfRows } from "../lib/report-compare";

test("links a unique structured finding to its page and withholds duplicate or partial evidence", () => {
  const line = "CFTR | Cystic fibrosis | Not detected | Limited panel";
  const row = { genes: "CFTR", condition: "Cystic fibrosis", result: "Not detected", details: "Limited panel" };
  const pages = ["CFTR Cystic fibrosis panel overview", line];
  expect(indexReportSource({ pages, paginated: true }).get(findingSourceKey(row))).toEqual({ text: line, page: 2 });
  expect(indexReportSource({ pages: [...pages, line], paginated: true }).get(findingSourceKey(row))).toBeNull();
  expect(indexReportSource({ pages, paginated: true }).get(findingSourceKey({ ...row, result: "Detected" }))).toBeUndefined();
});

const first = [
  "CFTR\tCystic fibrosis\tCarrier\tA heterozygous CFTR variant was reported",
  "CFTR\tCystic fibrosis\tAdditional finding\tPhase not supplied",
  "SMN1\tSpinal muscular atrophy\tIncreased carrier risk\t2 copies and a duplication-associated marker",
  "FMR1\tFragile X syndrome\tIntermediate allele\t44 and 48 CGG repeats",
  "HBA1 / HBA2\tAlpha thalassemia\tCarrier\tAlpha-globin deletion reported",
  "HBB\tSickle cell disease\tCarrier\tHemoglobin S reported",
  "GJB2\tNonsyndromic hearing loss\tUncertain\tLaboratory review recommended",
  "HEXA\tTay-Sachs disease\tEnzyme result borderline\tEnzyme assay",
  "DHCR7\tSmith‑Lemli‑Opitz syndrome\tCarrier\tSingle variant reported",
  "-\tOther recorded condition\tInconclusive",
].join("\r\n");

const second = [
  "Gene | Condition | Reported result | Details (optional)",
  "cftr | cystic fibrosis | Not detected | Limited variant panel",
  "SMN1 | Spinal muscular atrophy | Copy count reported | Two copies, marker result absent from excerpt",
  "HBA2/HBA1 | Alpha thalassemia | Not detected",
  "HBB | Beta thalassemia | Not detected",
  "HEXA | Tay-Sachs disease | Not detected | Sequencing",
  "DHCR7 | Smith-Lemli-Opitz syndrome | Carrier",
  "DMD | Duchenne muscular dystrophy | Deletion reported | Copy number finding",
  "- | Other recorded condition | Not detected",
].join("\n");

test("compares different lab layouts and preserves reported wording and assay limitations", () => {
  const a = parseReport(first);
  const b = parseReport(second);
  expect(a.rows).toHaveLength(10);
  expect(b.rows).toHaveLength(8);
  const rows = new Map(compareReports(a.rows!, b.rows!));
  expect(rows.get("CFTR:cystic fibrosis")).toMatchObject({
    first: [{ result: "Carrier" }, { result: "Additional finding", details: "Phase not supplied" }],
    second: [{ result: "Not detected", details: "Limited variant panel" }],
  });
  expect(rows.get("SMN1:spinal muscular atrophy")?.first[0].result).toBe("Increased carrier risk");
  expect(rows.get("FMR1:fragile x syndrome")?.first[0].details).toBe("44 and 48 CGG repeats");
  expect(rows.get("FMR1:fragile x syndrome")?.second).toEqual([]);
  expect(rows.get("HBA1/HBA2:alpha thalassemia")?.second).toHaveLength(1);
  expect(rows.get("HBB:sickle cell disease")?.second).toEqual([]);
  expect(rows.get("HBB:beta thalassemia")?.first).toEqual([]);
  expect(rows.get("DHCR7:smith-lemli-opitz syndrome")?.second).toHaveLength(1);
  expect(rows.get("HEXA:tay-sachs disease")).toMatchObject({ first: [{ details: "Enzyme assay" }], second: [{ details: "Sequencing" }] });
  expect([...rows.values()].filter(({ genes }) => genes === "-")).toHaveLength(2);
});

test("accepts only complete, bounded rows and reports the original line number", () => {
  expect(parseReport("\nCFTR|Cystic fibrosis|\n")).toEqual({ error: "row", line: 2 });
  expect(parseReport("\nGene | Condition | Result")).toEqual({ error: "empty" });
  expect(parseReport("x".repeat(MAX_REPORT_LENGTH + 1))).toEqual({ error: "size" });
  expect(parseReport("CFTR|Cystic fibrosis|Carrier\n".repeat(MAX_REPORT_ROWS + 1))).toEqual({ error: "size" });
  expect(parseReport("CFTR|Cystic fibrosis|Carrier|Notes|Extra")).toEqual({ error: "row", line: 1 });
  expect(parseReport("<img>|Cystic fibrosis|Carrier")).toEqual({ error: "row", line: 1 });
});

test("links only to indexed public reference topics", () => {
  expect(referenceLinks({ genes: "CFTR", condition: "Cystic fibrosis" }).map((link) => link.url)).toEqual([
    "https://medlineplus.gov/genetics/condition/cystic-fibrosis", "https://medlineplus.gov/genetics/gene/cftr",
  ]);
  expect(referenceLinks({ genes: "BAD-GENE-123", condition: "Unlisted condition" })).toEqual([]);
});

test("suggests only verified carrier-summary layouts and leaves other text for manual review", () => {
  const header = "Indication:   Carrier Test / Screening\nSpinal Muscular Atrophy (SMA)\nSummary:   NEGATIVE\nLaboratory Corporation of America";
  expect(suggestPdfRows(header)).toBe("SMN1 | Spinal muscular atrophy | NEGATIVE");
  expect(suggestPdfRows(header.replace("Spinal Muscular Atrophy (SMA)", "Fragile X Syndrome, Carrier"))).toBe("FMR1 | Fragile X syndrome | NEGATIVE");
  expect(suggestPdfRows(header.replace("Spinal Muscular Atrophy (SMA)", "Fragile X Syndrome, Diagnostic"))).toBeUndefined();
  expect(suggestPdfRows(header.replace("Carrier Test / Screening", "Fetal analysis"))).toBeUndefined();
  expect(suggestPdfRows(header.replace("NEGATIVE", "POSITIVE"))).toBeUndefined();
  expect(suggestPdfRows("Negative Results\nSMN1\nLaboratory Corporation of America")).toBeUndefined();
  expect(suggestPdfRows(header.replace("Laboratory Corporation of America", "Other laboratory"))).toBeUndefined();
});

test("distinguishes exact lab terms from other wording", () => {
  expect(reportedTerm("Carrier detected")).toBe("carrier");
  expect(reportedTerm("NEGATIVE")).toBe("negative");
  expect(reportedTerm("Variant of uncertain significance")).toBe("uncertain");
  expect(reportedTerm("Increased carrier risk")).toBe("other");
  expect(reportedTerm("No result")).toBe("other");
});
