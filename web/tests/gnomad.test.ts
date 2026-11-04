import { afterEach, expect, test, vi } from "vitest";
import { liveFrequency, summarise, VARIANT_ID } from "../lib/gnomad";

afterEach(() => vi.unstubAllGlobals());

test("summarise combines exome and genome and reports the Middle Eastern group", () => {
  const s = summarise({ exome: { ac: 90, an: 1000, populations: [{ id: "mid", ac: 2, an: 100 }] }, genome: { ac: 10, an: 1000, populations: [{ id: "mid", ac: 0, an: 100 }] } })!;
  expect(s.allele_frequency).toBe(0.05);
  expect(s.carrier_share).toBeCloseTo(0.095, 4);
  expect(s.middle_eastern_allele_number).toBe(200);
  expect(s.middle_eastern_carrier_share).toBeCloseTo(0.0198, 4);
  expect(summarise(null)).toBeNull();
});

test("live frequency validates ids, sends only the id, and tolerates unknown variants", async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: { variant: null } }) }));
  vi.stubGlobal("fetch", fetchMock);
  expect((await liveFrequency(["1-1-A-C"])).variants["1-1-A-C"]).toBeNull();
  expect(JSON.parse((fetchMock.mock.calls.flat()[1] as { body: string }).body).variables).toEqual({ id: "1-1-A-C", d: "gnomad_r4" });
  for (const bad of ["x", "7-1-A-C; drop", "Z-1-A-C"]) { expect(VARIANT_ID.test(bad)).toBe(false); await expect(liveFrequency([bad])).rejects.toThrow("422"); }
});
