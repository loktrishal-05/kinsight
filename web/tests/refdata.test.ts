import { expect, test } from "vitest";
import { api } from "../lib/api";

test("mock reference: the recorded CFTR answer with provenance, and a fallback for anything else", async () => {
  const cftr = await api.reference("CFTR", "NM_000492.4:c.1521_1523del");
  expect(cftr.unavailable).toEqual([]);
  expect(cftr.medlineplus?.summary).toContain("CFTR gene provides instructions");
  expect(cftr.clingen?.curations[0]?.classification).toBe("Definitive");
  expect(cftr.vep?.consequence).toBe("inframe_deletion");
  expect(cftr.medlineplus?.provenance.source).toBe("MedlinePlus Genetics");
  const other = await api.reference("HBB");
  expect(other.unavailable).toEqual(["medlineplus", "clingen"]);
  const wrongVariant = await api.reference("CFTR", "NM_000492.4:c.1A>G");
  expect(wrongVariant.unavailable).toEqual(["vep"]);
});
