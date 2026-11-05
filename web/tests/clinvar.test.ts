import { afterEach, expect, test, vi } from "vitest";
import { liveReclassify } from "../lib/clinvar";

afterEach(() => vi.unstubAllGlobals());

test("live ClinVar check sends only ids and alerts on a class crossing the 4/5 line", async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ result: {
    "7105": { germline_classification: { description: "Pathogenic" } },
    "42": { germline_classification: { description: "Uncertain significance" } },
    "9": { germline_classification: { description: "Conflicting classifications of pathogenicity" } } } }) }));
  vi.stubGlobal("fetch", fetchMock);
  const out = await liveReclassify({ "7105": 3, "42": 5, "9": 5 });
  expect(Object.fromEntries(out.alerts.map((a) => [a.variant, a.direction]))).toEqual({ "7105": "upgraded", "42": "downgraded" });
  expect(String(fetchMock.mock.calls.flat()[0])).toMatch(/&id=9,42,7105$/);
  await expect(liveReclassify({ "abc": 3 })).rejects.toThrow("422");
});

import { exploreGene } from "../lib/clinvar";

test("gene explorer validates the symbol and lists pathogenic records with their classes", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(String(url));
    return String(url).includes("esearch")
      ? { ok: true, json: async () => ({ esearchresult: { count: "1295", idlist: ["7105"] } }) }
      : { ok: true, json: async () => ({ result: { "7105": { title: "NM_000492.3(CFTR):c.1521_1523del", germline_classification: { description: "Pathogenic", review_status: "practice guideline" } } } }) };
  }));
  const out = await exploreGene("cftr");
  expect(out.total).toBe(1295);
  expect(out.rows[0]).toMatchObject({ id: "7105", label: "Pathogenic", review: "practice guideline" });
  expect(calls[0]).toContain("CFTR%5Bgene%5D");
  for (const bad of ["", "x", "CFTR; drop", "A".repeat(20)]) await expect(exploreGene(bad)).rejects.toThrow("422");
});
