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
